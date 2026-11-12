import { REST_API_BASE_URL } from '@/apollo/constants/RestApiBaseUrl';
import { SESSION_COOKIE_OPT_IN_HEADER_NAME } from 'twenty-shared/constants';

import { type VoiceCallStatus } from '@/ai/voice/call/voiceCallState';

const SAMPLE_RATE = 24_000;
const CHUNK_BYTES = (SAMPLE_RATE * 2) / 10;

const micErrorCode = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'mic_blocked';
    }
    if (error.name === 'NotFoundError') {
      return 'mic_not_found';
    }
    return `mic_error:${error.name}`;
  }
  return `mic_error:${String(error)}`;
};

export type VoiceCallListener = {
  onStatusChange: (status: VoiceCallStatus) => void;
  onAgentSpeakingChange: (speaking: boolean) => void;
  onErrorChange: (error: string | null) => void;
};

type GrokSessionPayload = {
  value: string;
  model: string;
  voice: string;
  agentId: string | null;
};

let listener: VoiceCallListener | null = null;
let socket: WebSocket | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let processor: ScriptProcessorNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let playbackTime = 0;
let pendingPcm = new Uint8Array(0);
let isMuted = false;

export const registerVoiceCallListener = (
  nextListener: VoiceCallListener,
): (() => void) => {
  listener = nextListener;
  return () => {
    listener = null;
  };
};

const floatTo16BitPcm = (float32: Float32Array): Uint8Array => {
  const out = new Int16Array(float32.length);
  for (let index = 0; index < float32.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, float32[index]));
    out[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(out.buffer);
};

const downsampleTo24k = (float32: Float32Array, inputRate: number): Uint8Array => {
  if (inputRate === SAMPLE_RATE) {
    return floatTo16BitPcm(float32);
  }
  const ratio = inputRate / SAMPLE_RATE;
  const newLength = Math.floor(float32.length / ratio);
  const result = new Float32Array(newLength);
  for (let index = 0; index < newLength; index += 1) {
    result[index] = float32[Math.floor(index * ratio)] ?? 0;
  }
  return floatTo16BitPcm(result);
};

const concatBytes = (first: Uint8Array, second: Uint8Array): Uint8Array => {
  const out = new Uint8Array(first.length + second.length);
  out.set(first, 0);
  out.set(second, first.length);
  return out;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
};

const playPcm16 = (pcmBytes: Uint8Array) => {
  if (!audioContext) {
    return;
  }
  const sampleCount = pcmBytes.length / 2;
  const buffer = audioContext.createBuffer(1, sampleCount, SAMPLE_RATE);
  const channel = buffer.getChannelData(0);
  const view = new DataView(
    pcmBytes.buffer,
    pcmBytes.byteOffset,
    pcmBytes.byteLength,
  );
  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = view.getInt16(index * 2, true) / 0x8000;
  }
  const node = audioContext.createBufferSource();
  node.buffer = buffer;
  node.connect(audioContext.destination);
  const startAt = Math.max(audioContext.currentTime, playbackTime);
  node.start(startAt);
  playbackTime = startAt + buffer.duration;
  listener?.onAgentSpeakingChange(true);
  window.setTimeout(
    () => {
      if (audioContext && audioContext.currentTime >= playbackTime - 0.05) {
        listener?.onAgentSpeakingChange(false);
      }
    },
    Math.max(50, buffer.duration * 1000),
  );
};

const cleanupCall = () => {
  try {
    processor?.disconnect();
  } catch {
    // already torn down
  }
  try {
    sourceNode?.disconnect();
  } catch {
    // already torn down
  }
  mediaStream?.getTracks().forEach((track) => track.stop());
  try {
    socket?.close();
  } catch {
    // already closed
  }
  void audioContext?.close();
  processor = null;
  sourceNode = null;
  mediaStream = null;
  socket = null;
  audioContext = null;
  pendingPcm = new Uint8Array(0);
  playbackTime = 0;
  isMuted = false;
  listener?.onAgentSpeakingChange(false);
  listener?.onStatusChange('idle');
};

export const stopVoiceCall = () => {
  cleanupCall();
};

export const startVoiceCall = async (): Promise<void> => {
  if (socket !== null) {
    return;
  }

  listener?.onStatusChange('connecting');
  listener?.onErrorChange(null);

  try {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    listener?.onErrorChange(micErrorCode(error));
    listener?.onStatusChange('idle');
    throw error;
  }

  const response = await fetch(`${REST_API_BASE_URL}/voice/grok-session`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      [SESSION_COOKIE_OPT_IN_HEADER_NAME]: '1',
    },
  });

  if (!response.ok) {
    listener?.onErrorChange('call_failed');
    listener?.onStatusChange('idle');
    throw new Error(`Grok session request failed: ${response.status}`);
  }

  const session = (await response.json()) as GrokSessionPayload;
  const wsUrl = session.agentId
    ? `wss://api.x.ai/v1/realtime?agent_id=${encodeURIComponent(session.agentId)}`
    : `wss://api.x.ai/v1/realtime?model=${encodeURIComponent(session.model)}`;

  await new Promise<void>((resolve, reject) => {
    const nextSocket = new WebSocket(wsUrl, [
      `xai-client-secret.${session.value}`,
    ]);
    socket = nextSocket;

    nextSocket.addEventListener('open', async () => {
      try {
        if (!session.agentId) {
          nextSocket.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                voice: session.voice || 'eve',
                instructions:
                  'You are the Mainframe CRM voice assistant. Keep replies short, clear, and conversational.',
                turn_detection: { type: 'server_vad' },
                audio: {
                  input: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
                  output: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
                },
              },
            }),
          );
        }

        audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        await audioContext.resume();
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        });
        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (event) => {
          if (!socket || socket.readyState !== WebSocket.OPEN || isMuted) {
            return;
          }
          const input = event.inputBuffer.getChannelData(0);
          const pcm = downsampleTo24k(input, audioContext?.sampleRate ?? SAMPLE_RATE);
          pendingPcm = concatBytes(pendingPcm, pcm);
          while (pendingPcm.length >= CHUNK_BYTES) {
            const chunk = pendingPcm.slice(0, CHUNK_BYTES);
            pendingPcm = pendingPcm.slice(CHUNK_BYTES);
            socket.send(
              JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: bytesToBase64(chunk),
              }),
            );
          }
        };
        sourceNode.connect(processor);
        processor.connect(audioContext.destination);
        listener?.onStatusChange('active');
        resolve();
      } catch (error) {
        cleanupCall();
        listener?.onErrorChange(
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'mic_blocked'
            : 'call_failed',
        );
        reject(error);
      }
    });

    nextSocket.addEventListener('message', (event) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(String(event.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      const type = payload.type;
      if (type === 'response.output_audio.delta' && typeof payload.delta === 'string') {
        const raw = atob(payload.delta);
        const bytes = new Uint8Array(raw.length);
        for (let index = 0; index < raw.length; index += 1) {
          bytes[index] = raw.charCodeAt(index);
        }
        playPcm16(bytes.slice(0, bytes.length - (bytes.length % 2)));
      } else if (type === 'input_audio_buffer.speech_started') {
        playbackTime = audioContext?.currentTime ?? 0;
        listener?.onAgentSpeakingChange(false);
      } else if (type === 'error') {
        listener?.onErrorChange('call_failed');
        cleanupCall();
      }
    });

    nextSocket.addEventListener('close', () => {
      cleanupCall();
    });

    nextSocket.addEventListener('error', () => {
      listener?.onErrorChange('call_failed');
      cleanupCall();
      reject(new Error('Grok WebSocket failed'));
    });
  });
};

export const setVoiceCallMuted = async (muted: boolean): Promise<void> => {
  isMuted = muted;
  mediaStream?.getAudioTracks().forEach((track) => {
    track.enabled = !muted;
  });
};
