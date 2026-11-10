"""Mainframe CRM voice agent — LiveKit realtime call assistant.

Two voice stacks, switched with VOICE_STACK in .env:
- "grok": native speech-to-speech — one Grok model on xAI's realtime socket does
  listening, thinking and speaking. No STT/TTS chain, no transcripts to convert.
- anything else: legacy pipeline — Deepgram STT -> DeepSeek (OpenRouter) ->
  Fish Audio TTS (Deepgram voice as fallback), Silero VAD for turn-taking.

Start with:  python mainframe_agent.py dev
"""

import asyncio
import base64
import json
import logging
import os
import ssl
from pathlib import Path

import aiohttp
import certifi
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentServer, AgentSession
from livekit.agents.tts import FallbackAdapter
from livekit.plugins import deepgram, fishaudio, silero
from livekit.plugins.openai import LLM as OpenRouterLLM

logger = logging.getLogger("mainframe-voice")

# this machine's Python 3.14 ships no CA bundle — aiohttp can't verify TLS without this
XAI_SSL_CTX = ssl.create_default_context(cafile=certifi.where())

load_dotenv(Path.home() / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

MAINFRAME_INSTRUCTIONS = """
You are the Mainframe CRM voice assistant — a friendly, capable assistant inside
a customer-relationship app used by a New Zealand real-estate agent. You are
having a spoken phone-style conversation, not writing text.

## How to speak
- Keep answers SHORT: usually one or two sentences. This is voice. Never read
  out long lists; offer to show them on screen instead.
- Casual, warm, natural NZ English. "Yep", "no worries", "sweet", "mate" are
  fine when they fit — do not force them.
- One idea per turn. Ask one question, then wait.
- Never sound like you're reading a manual. Plain words only.
- If asked whether you are AI, say yes briefly and carry on.

## What you help with
- Finding and summarising contacts, companies, deals, and tasks in the CRM.
- Drafting short follow-ups and next steps.
- Explaining what is in the CRM when the user asks.
If you cannot do something by voice, say so in one sentence and suggest doing
it on screen. Do not invent CRM data — if you don't know, say so.

## Conversations about the product
Mainframe CRM is the user's own system running on their machine. If they ask
about features beyond conversation, keep it brief and practical.

## Turn-taking
- Do not interrupt. Let the user finish.
- Do not fill silences. Short pauses are natural on a call.
- If the user goes quiet after you ask something, gently prompt once, then wait.
"""


class MainframeAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=MAINFRAME_INSTRUCTIONS)


server = AgentServer()
agent_name = os.getenv("AGENT_NAME", "mainframe-voice")


def build_tts():
    fish = fishaudio.TTS(
        model="s2.1-pro",
        voice_id=os.getenv("FISH_VOICE_ID", "4f69aad5ec724c4983aac2bcc8bee54e"),
        latency_mode="prefer_quality",
    )
    deepgram_fallback = deepgram.TTS(
        model="aura-2-andromeda-en",
        api_key=os.environ["DEEPGRAM_API_KEY"],
    )
    return FallbackAdapter([fish, deepgram_fallback])


@server.rtc_session(agent_name=agent_name)
async def entrypoint(ctx: agents.JobContext):
    if os.getenv("VOICE_STACK", "legacy").strip().lower() == "grok":
        await run_grok_session(ctx)
    else:
        await run_legacy_session(ctx)


async def run_legacy_session(ctx: agents.JobContext) -> None:
    session = AgentSession(
        stt=deepgram.STT(api_key=os.environ["DEEPGRAM_API_KEY"]),
        llm=OpenRouterLLM(
            model=os.getenv("VOICE_LLM_MODEL", "deepseek/deepseek-v4.1-flash"),
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
            temperature=0.6,
        ),
        tts=build_tts(),
        vad=silero.VAD.load(),
        allow_interruptions=True,
    )

    await session.start(
        room=ctx.room,
        agent=MainframeAssistant(),
        room_input_options=agents.RoomInputOptions(),
    )


# --- Grok native speech-to-speech stack (voice-only key, by agreement) ---

XAI_REALTIME_WS = "wss://api.x.ai/v1/realtime"
GROK_SAMPLE_RATE = 24000
# 100 ms of 24 kHz mono PCM16 — the chunk size xAI's own clients send
GROK_CHUNK_BYTES = GROK_SAMPLE_RATE * 2 // 10


async def wait_for_caller_track(room: rtc.Room) -> rtc.Track:
    def find_published():
        for participant in room.remote_participants.values():
            for publication in participant.track_publications.values():
                if (
                    publication.source == rtc.TrackSource.SOURCE_MICROPHONE
                    and publication.track
                ):
                    return publication.track
        return None

    track = find_published()
    if track:
        return track

    got_track = asyncio.get_running_loop().create_future()

    def on_subscribed(track, publication, participant):
        if publication.source == rtc.TrackSource.SOURCE_MICROPHONE and not got_track.done():
            got_track.set_result(track)

    room.on("track_subscribed", on_subscribed)
    try:
        return await asyncio.wait_for(got_track, timeout=90)
    finally:
        room.off("track_subscribed", on_subscribed)


async def run_grok_session(ctx: agents.JobContext) -> None:
    api_key = os.environ["XAI_API_KEY"]
    model = os.getenv("GROK_VOICE_MODEL", "grok-voice-latest")
    voice = os.getenv("GROK_VOICE", "eve")
    # xAI console agent (agent_id=…): persona + voice are owned by the console
    # config, so we must not send our own instructions/voice in session.update
    agent_id = os.getenv("GROK_AGENT_ID")

    room = ctx.room
    await ctx.connect()
    mic_track = await wait_for_caller_track(room)
    caller_audio = rtc.AudioStream(mic_track, sample_rate=GROK_SAMPLE_RATE)

    agent_source = rtc.AudioSource(GROK_SAMPLE_RATE, 1)
    agent_track = rtc.LocalAudioTrack.create_audio_track("grok-voice", agent_source)
    await room.local_participant.publish_track(
        agent_track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    )

    http = aiohttp.ClientSession()
    try:
        ws = await http.ws_connect(
            XAI_REALTIME_WS,
            headers={"Authorization": f"Bearer {api_key}"},
            params={"agent_id": agent_id} if agent_id else {"model": model},
            heartbeat=10,
            ssl=XAI_SSL_CTX,
        )
        try:
            # console agents (agent_id=…) are preconfigured server-side and pcm 24k
            # is already the default — sending session.update, even audio-only,
            # silently stops them responding (verified against agent_DBLHdNt3ZyJnL864)
            if not agent_id:
                await ws.send_json(
                    {
                        "type": "session.update",
                        "session": {
                            "voice": voice,
                            "instructions": MAINFRAME_INSTRUCTIONS,
                            "turn_detection": {"type": "server_vad"},
                            "audio": {
                                "input": {"format": {"type": "audio/pcm", "rate": GROK_SAMPLE_RATE}},
                                "output": {"format": {"type": "audio/pcm", "rate": GROK_SAMPLE_RATE}},
                            },
                        },
                    }
                )

            async def send_caller_audio():
                buf = bytearray()
                async for event in caller_audio:
                    buf += bytes(getattr(event, "frame", event).data)
                    while len(buf) >= GROK_CHUNK_BYTES:
                        chunk = bytes(buf[:GROK_CHUNK_BYTES])
                        del buf[:GROK_CHUNK_BYTES]
                        await ws.send_json(
                            {
                                "type": "input_audio_buffer.append",
                                "audio": base64.b64encode(chunk).decode(),
                            }
                        )

            async def receive_grok_events():
                async for msg in ws:
                    if msg.type != aiohttp.WSMsgType.TEXT:
                        continue
                    event = json.loads(msg.data)
                    etype = event.get("type")
                    if etype == "response.output_audio.delta":
                        pcm = base64.b64decode(event["delta"])
                        pcm = pcm[: len(pcm) // 2 * 2]
                        frame = rtc.AudioFrame.create(
                            GROK_SAMPLE_RATE, 1, len(pcm) // 2
                        )
                        frame.data.cast("B")[:] = pcm
                        await agent_source.capture_frame(frame)
                    elif etype == "input_audio_buffer.speech_started":
                        # caller barged in — drop stale queued audio so Grok can be interrupted
                        agent_source.clear_queue()
                    elif etype == "response.output_audio_transcript.delta":
                        logger.info("grok: %s", event.get("delta", ""))
                    elif etype == "error":
                        logger.error("xai realtime error: %s", event)

            tasks = [
                asyncio.create_task(send_caller_audio()),
                asyncio.create_task(receive_grok_events()),
            ]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            for task in done:
                task.result()
        finally:
            await ws.close()
    finally:
        await http.close()


if __name__ == "__main__":
    agents.cli.run_app(server)
