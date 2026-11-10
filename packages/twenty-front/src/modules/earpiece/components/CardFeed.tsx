"use client";

import type { Card, CardKind } from "../lib/types";

const STYLE: Record<CardKind, { label: string; color: string; dot: string }> = {
  say_this: { label: "Say this", color: "var(--color-brand)", dot: "bg-brand" },
  signal: { label: "Buying signal", color: "var(--color-signal)", dot: "bg-signal" },
  objection: { label: "Pushback", color: "var(--color-objection)", dot: "bg-objection" },
  warning: { label: "Careful", color: "var(--color-warning)", dot: "bg-warning" },
  fact: { label: "Worth knowing", color: "var(--color-fact)", dot: "bg-fact" },
};

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CardFeed({ cards, live }: { cards: Card[]; live: boolean }) {
  if (cards.length === 0) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
        {live ? (
          <>
            <div className="mb-4 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-brand ep-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-muted">Listening.</p>
            <p className="mt-1 max-w-xs text-sm text-faint">
              Nothing worth interrupting you for yet. Cards appear here the moment
              something matters.
            </p>
          </>
        ) : (
          <p className="max-w-xs text-sm text-faint">
            Once the call starts, prompts appear here.
          </p>
        )}
      </div>
    );
  }

  // Newest first — during a call your eyes go to the top of the column.
  const ordered = [...cards].reverse();

  return (
    <div className="space-y-3">
      {ordered.map((card, i) => {
        const style = STYLE[card.kind] ?? STYLE.fact;
        const isHero = card.kind === "say_this";
        const isNewest = i === 0;

        return (
          <article
            key={card.id}
            className={`${isNewest ? "ep-in" : ""} rounded-xl border bg-surface p-4 ${
              isHero ? "border-brand/40 bg-brand/[0.06]" : "border-line-soft"
            }`}
            style={
              card.urgency === 3 && !isHero
                ? { borderColor: style.color, background: `color-mix(in srgb, ${style.color} 7%, transparent)` }
                : undefined
            }
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              <span
                className="text-[11px] font-semibold tracking-wide uppercase"
                style={{ color: style.color }}
              >
                {style.label}
              </span>
              <span className="ml-auto font-mono text-[11px] text-faint">
                {clock(card.at)}
              </span>
            </div>

            <h3 className={`font-semibold ${isHero ? "text-lg" : "text-[15px]"}`}>
              {card.title}
            </h3>
            <p
              className={`mt-1 leading-relaxed ${
                isHero ? "text-[15px] text-text" : "text-sm text-muted"
              }`}
            >
              {card.body}
            </p>
          </article>
        );
      })}
    </div>
  );
}
