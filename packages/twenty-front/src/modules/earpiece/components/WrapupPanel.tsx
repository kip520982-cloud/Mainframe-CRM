"use client";

import { useState } from "react";
import type { Card, CallMode, Wrapup } from "../lib/types";

const LABELS: Partial<
  Record<CallMode, { email: string; commitments: string; objections: string }>
> = {
  recruit_candidate: {
    email: "Follow-up to the candidate, ready to send",
    commitments: "Key facts captured",
    objections: "Concerns & flags",
  },
  recruit_client: {
    email: "Follow-up to the client, ready to send",
    commitments: "Role & terms captured",
    objections: "What they pushed back on",
  },
};

const TEMPERATURE_COLOR = (t?: string) => {
  const v = (t ?? "").toLowerCase();
  if (v.startsWith("hot")) {return "text-signal";}
  if (v.startsWith("warm")) {return "text-brand";}
  if (v.startsWith("cool")) {return "text-objection";}
  return "text-warning";
};

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line-soft bg-surface p-5">
      <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-faint uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function WrapupPanel({
  wrapup,
  cards,
  mode = "sales",
}: {
  wrapup: Wrapup;
  cards: Card[];
  mode?: CallMode;
}) {
  const [copied, setCopied] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);
  const email = wrapup.follow_up_email;
  const pitch = wrapup.pitch;
  const labels = LABELS[mode] ?? {
    email: "Follow-up email, ready to send",
    commitments: "What was agreed",
    objections: "What they pushed back on",
  };

  async function copyEmail() {
    if (!email) {return;}
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyPitch() {
    if (!pitch?.body) {return;}
    await navigator.clipboard.writeText(pitch.body);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 2000);
  }

  const list = (items?: string[]) =>
    Array.isArray(items) && items.length > 0 ? (
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-faint" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-faint">Nothing recorded.</p>
    );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-faint uppercase">
          How that went
        </h2>
        {wrapup.temperature && (
          <p
            className={`text-[15px] leading-relaxed font-medium ${TEMPERATURE_COLOR(
              wrapup.temperature
            )}`}
          >
            {wrapup.temperature}
          </p>
        )}
      </div>

      {wrapup.summary && (
        <Block title="The short version">
          <p className="text-[15px] leading-relaxed text-text">{wrapup.summary}</p>
        </Block>
      )}

      {pitch?.body && (
        <Block title={pitch.title || "Ready to paste"}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted">
            {pitch.body}
          </p>
          <button
            onClick={copyPitch}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            {pitchCopied ? "Copied" : "Copy"}
          </button>
        </Block>
      )}

      {email && (
        <Block title={labels.email}>
          <p className="mb-1 text-xs text-faint">Subject</p>
          <p className="mb-4 font-medium">{email.subject}</p>
          <p className="mb-1 text-xs text-faint">Body</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted">
            {email.body}
          </p>
          <button
            onClick={copyEmail}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            {copied ? "Copied" : "Copy email"}
          </button>
        </Block>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="What to do next">{list(wrapup.next_steps)}</Block>
        <Block title={labels.commitments}>{list(wrapup.commitments)}</Block>
        <Block title={labels.objections}>{list(wrapup.objections_raised)}</Block>
        <Block title="Do this differently next time">{list(wrapup.coaching)}</Block>
      </div>

      {cards.length > 0 && (
        <Block title={`Prompts during the call (${cards.length})`}>
          <ul className="space-y-2.5">
            {cards.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium text-text">{c.title}</span>
                <span className="text-muted"> — {c.body}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}
