"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { earpieceFetch } from "../lib/api";
import type { Brief, CallRow, Card, Fact, Line, Play, Wrapup } from "../lib/types";
import {
  SourceRecorder,
  captureMic,
  captureTheirSide,
  extensionFor,
  type Speaker,
} from "../lib/recorder";
import { BriefPanel } from "./BriefPanel";
import { CardFeed } from "./CardFeed";
import { WrapupPanel } from "./WrapupPanel";
import { Logo } from "./Logo";

type Phase = "prep" | "live" | "wrapping" | "done";

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function CallConsole({
  initialCall,
  initialLines,
  initialCards,
  initialFacts,
  onExit,
  onOpenCall,
}: {
  initialCall: CallRow;
  initialLines: Line[];
  initialCards: Card[];
  initialFacts: Fact[];
  onExit: () => void;
  onOpenCall: (callId: string) => void;
}) {
  const [call, setCall] = useState(initialCall);
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [facts, setFacts] = useState<Fact[]>(initialFacts);
  const [activePlay, setActivePlay] = useState<number | null>(null);
  const [wrapup, setWrapup] = useState<Wrapup | null>(initialCall.wrapup);
  const [phase, setPhase] = useState<Phase>(
    initialCall.status === "done" ? "done" : "prep"
  );
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState({ you: 0, them: 0 });
  // Recruiter calls mostly happen on a phone next to the computer, so the mic
  // hears both sides on speaker — tab sharing would just be a confusing step.
  const recruiting =
    initialCall.mode === "recruit_candidate" || initialCall.mode === "recruit_client";
  const [wantTheirAudio, setWantTheirAudio] = useState(!recruiting);
  const [hasTheirAudio, setHasTheirAudio] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rerunning, setRerunning] = useState(false);

  // oxlint-disable-next-line twenty/no-state-useref -- imperative MediaRecorder handles, not state
  const startedAtRef = useRef(0);
  // oxlint-disable-next-line twenty/no-state-useref -- imperative MediaRecorder handles, not state
  const recordersRef = useRef<SourceRecorder[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  /* ---------------------------------------------------------------- brief */

  const refreshCall = useCallback(async () => {
    const res = await earpieceFetch(`/calls/${initialCall.id}`);
    if (!res.ok) {return null;}
    const data = await res.json();
    setCall(data.call);
    return data.call as CallRow;
  }, [initialCall.id]);

  const runResearch = useCallback(async () => {
    setCall((c) => ({ ...c, brief_status: "running", brief_error: null }));
    try {
      const res = await earpieceFetch("/research", {
        method: "POST",
        body: JSON.stringify({ id: initialCall.id }),
      });
      const data = await res.json();
      if (data.brief) {setCall((c) => ({ ...c, brief: data.brief, brief_status: "ready" }));}
      else {await refreshCall();}
    } catch {
      await refreshCall();
    }
  }, [initialCall.id, refreshCall]);

  // Start the research on arrival, or pick up one already running in another tab.
  useEffect(() => {
    if (initialCall.brief_status === "pending") {
      runResearch();
      return;
    }
    if (initialCall.brief_status !== "running") {return;}

    const poll = setInterval(async () => {
      const fresh = await refreshCall();
      if (fresh && fresh.brief_status !== "running") {clearInterval(poll);}
    }, 4000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------------------- timers */

  useEffect(() => {
    if (phase !== "live") {return;}
    const tick = setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
      const yours = recordersRef.current.find((r) => r.speaker === "you");
      const theirs = recordersRef.current.find((r) => r.speaker === "them");
      setLevels({ you: yours?.level ?? 0, them: theirs?.level ?? 0 });
    }, 150);
    return () => clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) {el.scrollTop = el.scrollHeight;}
  }, [lines]);

  /* ------------------------------------------------- listen (hear + coach) */

  // One round trip per slice of speech: the audio goes up, and the
  // transcript, cards and key points all come back together. No separate
  // coach loop to wait on.
  const handleChunk = useCallback(
    async ({
      blob,
      speaker,
      at,
      mime,
    }: {
      blob: Blob;
      speaker: Speaker;
      at: number;
      mime: string;
    }) => {
      const fd = new FormData();
      fd.append("audio", blob, `slice.${extensionFor(mime)}`);
      fd.append("callId", initialCall.id);
      fd.append("speaker", speaker);
      fd.append("at", String(Math.round(at)));
      fd.append("mixed", recordersRef.current.length < 2 ? "1" : "0");
      try {
        const res = await earpieceFetch("/listen", { method: "POST", body: fd });
        const data = await res.json();
        if (data.line) {setLines((prev) => [...prev, data.line as Line]);}
        if (Array.isArray(data.cards) && data.cards.length) {
          setCards((prev) => [...prev, ...data.cards]);
        }
        if (Array.isArray(data.facts) && data.facts.length) {
          setFacts((prev) => [...prev, ...data.facts]);
        }
        if (typeof data.play === "number") {setActivePlay(data.play);}
      } catch {
        /* one lost slice; the next one is seconds away */
      }
    },
    [initialCall.id]
  );

  /* -------------------------------------------------------- start / stop */

  async function startListening() {
    setError("");
    setNotice("");

    let mic: MediaStream;
    try {
      mic = await captureMic();
    } catch {
      setError(
        "Earpiece couldn't get your microphone. Allow microphone access for this site and try again."
      );
      return;
    }

    let theirs: MediaStream | null = null;
    if (wantTheirAudio) {
      try {
        theirs = await captureTheirSide();
      } catch (err) {
        setNotice(
          err instanceof Error && err.message.includes("No audio")
            ? err.message + " Carrying on with your microphone only."
            : "Carrying on with your microphone only — it'll still hear them if they're on speaker."
        );
      }
    }

    startedAtRef.current = Date.now();
    const elapsedSeconds = () => (Date.now() - startedAtRef.current) / 1000;

    const recorders = [new SourceRecorder(mic, "you", handleChunk, elapsedSeconds)];
    if (theirs) {
      recorders.push(new SourceRecorder(theirs, "them", handleChunk, elapsedSeconds));
      setHasTheirAudio(true);
    }
    recorders.forEach((r) => r.start());
    recordersRef.current = recorders;

    setPhase("live");
    earpieceFetch(`/calls/${initialCall.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "live", started_at: new Date().toISOString() }),
    }).catch(() => {});
  }

  async function stopListening() {
    recordersRef.current.forEach((r) => r.stop());
    recordersRef.current = [];
    setPhase("wrapping");

    // Give the last slice in flight a moment to land before summarising.
    await new Promise((r) => setTimeout(r, 2500));

    try {
      const res = await earpieceFetch("/wrapup", {
        method: "POST",
        body: JSON.stringify({ callId: initialCall.id }),
      });
      const data = await res.json();
      if (data.wrapup) {setWrapup(data.wrapup);}
      else {setError(data.error ?? "Couldn't write the summary.");}
    } catch {
      setError("Couldn't write the summary.");
    }
    setPhase("done");
  }

  // Warn before a refresh throws away a call in progress.
  useEffect(() => {
    if (phase !== "live") {return;}
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  useEffect(() => () => recordersRef.current.forEach((r) => r.stop()), []);

  async function callAgain() {
    setRerunning(true);
    try {
      const res = await earpieceFetch(`/calls/${initialCall.id}/rerun`, { method: "POST" });
      const data = await res.json();
      if (data.call?.id) {
        onOpenCall(data.call.id as string);
        return;
      }
      setError(data.error ?? "Couldn't set up the new call.");
    } catch {
      setError("Couldn't set up the new call.");
    }
    setRerunning(false);
  }

  /* ----------------------------------------------------------------- view */

  const sorted = [...lines].sort((a, b) => a.at - b.at || a.id - b.id);
  const youWords = sorted
    .filter((l) => l.speaker === "you")
    .reduce((sum, l) => sum + countWords(l.text), 0);
  const themWords = sorted
    .filter((l) => l.speaker === "them")
    .reduce((sum, l) => sum + countWords(l.text), 0);
  const totalWords = youWords + themWords;
  const yourShare = totalWords > 0 ? youWords / totalWords : 0;
  const talkingTooMuch = totalWords > 80 && yourShare > 0.65;

  // During the call, covered ground disappears: only the two most recent cards,
  // and nothing older than 90 seconds, stay on screen. Everything is kept for
  // the wrap-up.
  const liveCards =
    phase === "live"
      ? cards.slice(-2).filter((c) => elapsed - c.at < 90)
      : cards;

  const playbook: Play[] = Array.isArray(call.playbook) ? (call.playbook as Play[]) : [];
  const shownPlay = activePlay !== null ? playbook[activePlay] : null;

  const title = call.prospect_name || call.company || "Untitled call";
  const subtitle = call.prospect_name && call.company ? call.company : call.website;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------------------------------------- bar */}
      <header className="sticky top-0 z-20 border-b border-line-soft bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-3.5">
          <button
            onClick={onExit}
            className="shrink-0 cursor-pointer transition hover:opacity-70"
            aria-label="Back to Earpiece home"
          >
            <Logo small />
          </button>

          <div className="mx-2 h-6 w-px bg-line-soft" />

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{title}</p>
            {subtitle && <p className="truncate text-xs text-faint">{subtitle}</p>}
          </div>

          {phase === "live" && (
            <>
              <div className="hidden items-center gap-4 md:flex">
                <Meter label="You" level={levels.you} color="var(--color-brand)" />
                {hasTheirAudio ? (
                  <Meter label="Them" level={levels.them} color="var(--color-fact)" />
                ) : (
                  <span className="text-xs text-faint">Mic only</span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
                <span className="h-2 w-2 rounded-full bg-warning ep-pulse" />
                {clock(elapsed)}
              </div>
              <button
                onClick={stopListening}
                className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-medium transition hover:border-warning hover:text-warning"
              >
                End call
              </button>
            </>
          )}

          {phase === "prep" && (
            <button
              onClick={startListening}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
            >
              Start listening
            </button>
          )}

          {phase === "wrapping" && (
            <span className="text-sm text-muted ep-pulse">Writing it up…</span>
          )}

          {phase === "done" && (
            <button
              onClick={callAgain}
              disabled={rerunning}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-40"
            >
              {rerunning ? "Setting up…" : "Call again"}
            </button>
          )}
        </div>
      </header>

      {(error || notice) && (
        <div className="mx-auto w-full max-w-[1600px] px-6 pt-4">
          {error && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
              {notice}
            </p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ body */}
      <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* brief */}
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-faint uppercase">
            Before you dial
          </h2>

          {call.brief_status === "running" && (
            <div className="rounded-xl border border-line-soft bg-surface p-5">
              <p className="text-sm text-muted ep-pulse">
                {call.mode === "recruit_candidate"
                  ? "Reading their CV against the role…"
                  : "Reading up on them…"}
              </p>
              <p className="mt-2 text-xs text-faint">
                {call.mode === "recruit_candidate"
                  ? "Building the screen from the CV and role you gave it. Usually under a minute."
                  : "Searching the web, their site and anything public. Usually under a minute."}
              </p>
            </div>
          )}

          {call.brief_status === "failed" && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
              <p className="text-sm text-warning">The research didn&rsquo;t finish.</p>
              {call.brief_error && (
                <p className="mt-2 text-xs break-words text-faint">{call.brief_error}</p>
              )}
              <button
                onClick={runResearch}
                className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-brand hover:text-brand"
              >
                Try again
              </button>
            </div>
          )}

          {call.brief_status === "ready" && call.brief && (
            <BriefPanel brief={call.brief as Brief} mode={call.mode} />
          )}

          {call.notes && (
            <div className="mt-5 border-t border-line-soft pt-4">
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">
                Your notes
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted">
                {call.notes}
              </p>
            </div>
          )}
        </aside>

        {/* cards, or the write-up once the call is over */}
        <section className="min-w-0">
          {phase === "done" && wrapup ? (
            <WrapupPanel wrapup={wrapup} cards={cards} mode={call.mode} />
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-faint uppercase">
                  {phase === "live" ? "In your ear" : "Live prompts"}
                </h2>
                {phase === "live" && cards.length > 0 && (
                  <span className="text-xs text-faint">{cards.length} so far</span>
                )}
              </div>

              {phase === "prep" && (
                <div className="mb-5 rounded-xl border border-line-soft bg-surface p-5">
                  <h3 className="font-medium">Before you start</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {recruiting
                      ? "Earpiece listens through this device's microphone. Taking the call on your phone? Put it on speaker next to this device and the mic will hear both sides."
                      : "Earpiece listens through your microphone. To hear the other person clearly, it can also listen to a browser tab — the one running Zoom, Meet or Teams."}
                  </p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={wantTheirAudio}
                      onChange={(e) => setWantTheirAudio(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
                    />
                    <span className="text-sm">
                      <span className="font-medium">Also listen to their side</span>
                      <span className="mt-0.5 block text-faint">
                        You&rsquo;ll be asked to pick a tab. Tick &ldquo;Also share tab
                        audio&rdquo; in that box, or it won&rsquo;t hear them.
                      </span>
                    </span>
                  </label>
                  <button
                    onClick={startListening}
                    className="mt-5 w-full rounded-xl bg-brand py-3 font-semibold text-ink transition hover:brightness-110"
                  >
                    Start listening
                  </button>
                  <p className="mt-3 text-xs text-faint">
                    Make sure everyone on the call knows they&rsquo;re being recorded.
                  </p>
                </div>
              )}

              {phase === "wrapping" && (
                <div className="mb-5 rounded-xl border border-line-soft bg-surface p-5">
                  <p className="text-sm text-muted ep-pulse">
                    Going back over the call and writing your follow-up…
                  </p>
                </div>
              )}

              {phase === "live" && shownPlay && (
                <div className="ep-in relative mb-5 rounded-2xl border-2 border-objection bg-objection/[0.07] p-6">
                  <button
                    onClick={() => setActivePlay(null)}
                    className="absolute top-3 right-4 text-lg leading-none text-faint transition hover:text-text"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                  <p className="text-2xl leading-snug font-bold text-objection">
                    {shownPlay.q}
                  </p>
                  <p className="mt-4 text-xl leading-relaxed font-medium text-text">
                    {shownPlay.a}
                  </p>
                </div>
              )}

              {phase === "prep" && playbook.length > 0 && (
                <div className="mb-5 space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide text-faint uppercase">
                    Your playbook — these flash up when the conversation heads there
                  </h3>
                  {playbook.map((pl, i) => (
                    <div key={i} className="rounded-xl border border-line-soft bg-surface p-5">
                      <p className="text-lg leading-snug font-bold text-objection">{pl.q}</p>
                      <p className="mt-2 leading-relaxed text-muted">{pl.a}</p>
                    </div>
                  ))}
                </div>
              )}

              {phase !== "prep" && <CardFeed cards={liveCards} live={phase === "live"} />}
            </>
          )}
        </section>

        {/* transcript + how you're doing */}
        <aside className="min-w-0">
          {facts.length > 0 && (
            <div className="mb-5 rounded-xl border border-brand/25 bg-brand/[0.05] p-4">
              <h2 className="mb-2.5 text-[11px] font-semibold tracking-wide text-brand uppercase">
                Key points — use these in your close
              </h2>
              <ul className="space-y-1.5">
                {facts.map((f) => (
                  <li key={f.id} className="flex gap-2 text-sm leading-snug">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" />
                    <span className="text-text">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="mb-4 text-sm font-semibold tracking-wide text-faint uppercase">
            What&rsquo;s being said
          </h2>

          {totalWords > 0 && (
            <div className="mb-4 rounded-xl border border-line-soft bg-surface p-4">
              <div className="mb-2 flex items-baseline justify-between text-xs">
                <span className={talkingTooMuch ? "text-objection" : "text-muted"}>
                  You {Math.round(yourShare * 100)}%
                </span>
                <span className="text-faint">
                  Them {Math.round((1 - yourShare) * 100)}%
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div
                  className={talkingTooMuch ? "bg-objection" : "bg-brand"}
                  style={{ width: `${yourShare * 100}%` }}
                />
                <div className="flex-1 bg-fact/60" />
              </div>
              {talkingTooMuch && (
                <p className="mt-2 text-xs text-objection">
                  You&rsquo;re doing most of the talking. Ask something open.
                </p>
              )}
            </div>
          )}

          <div
            ref={transcriptRef}
            className="max-h-[calc(100vh-20rem)] space-y-3 overflow-y-auto pr-1"
          >
            {sorted.length === 0 ? (
              <p className="text-sm text-faint">
                {phase === "live"
                  ? "Waiting for the first few words…"
                  : "Nothing captured yet."}
              </p>
            ) : (
              sorted.map((line) => (
                <div key={line.id} className="text-sm">
                  <span
                    className={`mr-2 font-mono text-[11px] ${
                      line.speaker === "you" ? "text-brand" : "text-fact"
                    }`}
                  >
                    {line.speaker === "you" ? "YOU" : "THEM"}
                  </span>
                  <span className="leading-relaxed text-muted">{line.text}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Meter({
  label,
  level,
  color,
}: {
  label: string;
  level: number;
  color: string;
}) {
  // Speech RMS sits well below 1, so scale it up to fill the meter.
  const bars = Math.min(5, Math.round(level * 90));
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-faint">{label}</span>
      <div className="flex gap-[2px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-3 w-[3px] rounded-full transition-colors"
            style={{ background: i < bars ? color : "var(--color-line)" }}
          />
        ))}
      </div>
    </div>
  );
}
