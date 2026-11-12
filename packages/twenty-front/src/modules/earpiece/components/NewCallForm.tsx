"use client";

import { useState } from "react";
import { earpieceFetch } from "../lib/api";
import type { CallMode, CallRow } from "../lib/types";

const MODES: { value: CallMode; label: string; hint: string }[] = [
  {
    value: "sales",
    label: "Sales call",
    hint: "Live lines to say, objection counters, closing help.",
  },
  {
    value: "interview",
    label: "Job interview",
    hint: "Gentle reminders and note-taking — no scripts.",
  },
  {
    value: "recruit_candidate",
    label: "Candidate call",
    hint: "Paste their CV. Screening questions, auto notes, fit verdict.",
  },
  {
    value: "recruit_client",
    label: "Client call",
    hint: "A company you recruit for. Research, role scoping, terms.",
  },
];

type Field = {
  key: string;
  label: string;
  placeholder: string;
  rows?: number;
};

const FIELDS: Record<CallMode, Field[]> = {
  sales: [
    { key: "prospect_name", label: "Their name", placeholder: "Sarah Whitfield" },
    { key: "company", label: "Company", placeholder: "Whitfield Plumbing" },
    { key: "website", label: "Website", placeholder: "whitfieldplumbing.co.nz" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/…" },
    {
      key: "notes",
      label: "Anything you already know",
      placeholder:
        "Came in from the website form. Mentioned they're frustrated with their current supplier.",
      rows: 4,
    },
  ],
  interview: [
    { key: "prospect_name", label: "Interviewer's name", placeholder: "Sarah Whitfield" },
    { key: "company", label: "Company", placeholder: "Whitfield Plumbing" },
    { key: "website", label: "Website", placeholder: "whitfieldplumbing.co.nz" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/…" },
    {
      key: "notes",
      label: "Anything you already know",
      placeholder: "Second round, with the hiring manager. First round went well.",
      rows: 4,
    },
  ],
  recruit_candidate: [
    { key: "prospect_name", label: "Candidate's name", placeholder: "Jordan Mete" },
    { key: "linkedin", label: "LinkedIn (optional)", placeholder: "linkedin.com/in/…" },
    {
      key: "role_spec",
      label: "The role you're placing them for",
      placeholder:
        "Service manager at an Auckland automotive group. $95-110k. Needs 5+ years workshop experience and a team-lead background.",
      rows: 4,
    },
    {
      key: "cv",
      label: "Paste their CV",
      placeholder: "Paste the whole CV in here — the brief is built from it.",
      rows: 10,
    },
    {
      key: "notes",
      label: "Anything else you know",
      placeholder: "Referred by a placed candidate. Unhappy with current employer's hours.",
      rows: 3,
    },
  ],
  recruit_client: [
    { key: "prospect_name", label: "Contact's name", placeholder: "Sarah Whitfield" },
    { key: "company", label: "Company", placeholder: "Whitfield Plumbing" },
    { key: "website", label: "Website", placeholder: "whitfieldplumbing.co.nz" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/…" },
    {
      key: "role_spec",
      label: "The role they're hiring for (what you know so far)",
      placeholder: "Two qualified plumbers, drainage tickets a bonus. First chat about terms.",
      rows: 3,
    },
    {
      key: "notes",
      label: "Anything else you know",
      placeholder: "Met at a networking event. They've been burnt by an agency before.",
      rows: 3,
    },
  ],
};

export function NewCallForm({ onCreated }: { onCreated: (call: CallRow) => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<CallMode>("sales");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = Boolean(
    mode === "recruit_candidate"
      ? (form.prospect_name || form.cv)?.trim()
      : (form.prospect_name || form.company || form.website)?.trim()
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {return;}
    setBusy(true);
    setError("");

    try {
      const res = await earpieceFetch("/calls", {
        method: "POST",
        body: JSON.stringify({ ...form, mode }),
      });

      if (!res.ok) {
        setError("Couldn't save that. Try again.");
        setBusy(false);
        return;
      }

      const { call } = await res.json();
      // The call page starts the research itself, so it survives this navigation.
      onCreated(call as CallRow);
    } catch {
      setError("Couldn't save that. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              mode === m.value
                ? "border-brand bg-brand/10"
                : "border-line bg-surface hover:border-faint"
            }`}
          >
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className="mt-0.5 block text-xs text-faint">{m.hint}</span>
          </button>
        ))}
      </div>

      {FIELDS[mode].map((f) => (
        <div key={f.key}>
          <label className="mb-1.5 block text-sm text-muted">{f.label}</label>
          {f.rows ? (
            <textarea
              rows={f.rows}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 outline-none transition placeholder:text-faint focus:border-brand"
            />
          ) : (
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none transition placeholder:text-faint focus:border-brand"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-warning">{error}</p>}

      <button
        disabled={!canSubmit || busy}
        className="w-full rounded-xl bg-brand py-3.5 font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {busy
          ? "Setting up…"
          : mode === "recruit_candidate"
            ? "Build the brief"
            : "Research them"}
      </button>
    </form>
  );
}
