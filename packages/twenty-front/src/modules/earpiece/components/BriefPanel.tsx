"use client";

import type { Brief, CallMode } from "../lib/types";

type Headings = {
  what_they_do: string;
  person: string;
  pains: string;
  hooks: string;
  questions: string;
  objections: string;
};

const DEFAULT_HEADINGS: Headings = {
  what_they_do: "What they do",
  person: "Who you're talking to",
  pains: "What's probably hurting",
  hooks: "Ways in",
  questions: "Questions to ask",
  objections: "Expect pushback on",
};

const MODE_HEADINGS: Partial<Record<CallMode, Partial<Headings>>> = {
  recruit_candidate: {
    what_they_do: "Their background",
    person: "Snapshot",
    pains: "Probe these",
    hooks: "Talking points",
    questions: "Screening questions",
    objections: "Likely hesitations",
  },
  recruit_client: {
    pains: "Their likely hiring pains",
    questions: "Role-scoping questions",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line-soft pt-4 first:border-0 first:pt-0">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function BriefPanel({ brief, mode = "sales" }: { brief: Brief; mode?: CallMode }) {
  const has = (arr?: unknown[]) => Array.isArray(arr) && arr.length > 0;
  const h: Headings = { ...DEFAULT_HEADINGS, ...(MODE_HEADINGS[mode] ?? {}) };

  return (
    <div className="space-y-5 text-sm">
      {brief.headline && (
        <p className="text-[15px] leading-relaxed font-medium text-text">
          {brief.headline}
        </p>
      )}

      {brief.what_they_do && (
        <Section title={h.what_they_do}>
          <p className="leading-relaxed text-muted">{brief.what_they_do}</p>
        </Section>
      )}

      {brief.person && (brief.person.role || brief.person.background) && (
        <Section title={h.person}>
          {brief.person.role && (
            <p className="mb-1 font-medium text-text">{brief.person.role}</p>
          )}
          {brief.person.background && (
            <p className="leading-relaxed text-muted">{brief.person.background}</p>
          )}
        </Section>
      )}

      {has(brief.likely_pains) && (
        <Section title={h.pains}>
          <ul className="space-y-2.5">
            {brief.likely_pains!.map((p, i) => (
              <li key={i}>
                <p className="font-medium text-text">{p.pain}</p>
                <p className="mt-0.5 leading-relaxed text-muted">{p.why}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {has(brief.hooks) && (
        <Section title={h.hooks}>
          <ul className="space-y-2">
            {brief.hooks!.map((h, i) => (
              <li key={i} className="border-l-2 border-brand/50 pl-3 leading-relaxed text-muted">
                {h}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {has(brief.questions_to_ask) && (
        <Section title={h.questions}>
          <ul className="space-y-2">
            {brief.questions_to_ask!.map((q, i) => (
              <li key={i} className="flex gap-2.5 leading-relaxed text-muted">
                <span className="text-faint tabular-nums">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {has(brief.objections_expected) && (
        <Section title={h.objections}>
          <ul className="space-y-3">
            {brief.objections_expected!.map((o, i) => (
              <li key={i}>
                <p className="font-medium text-objection">&ldquo;{o.objection}&rdquo;</p>
                <p className="mt-1 leading-relaxed text-muted">{o.response}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {has(brief.dont_say) && (
        <Section title="Don't say">
          <ul className="space-y-1.5">
            {brief.dont_say!.map((d, i) => (
              <li key={i} className="leading-relaxed text-warning/90">
                {d}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {has(brief.sources) && (
        <Section title="Where this came from">
          <ul className="space-y-1">
            {brief.sources!.map((s, i) => (
              <li key={i}>
                <a
                  href={s}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-faint underline decoration-line hover:text-muted"
                >
                  {s.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
