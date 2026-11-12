"use client";

import { useState } from "react";
import { earpieceFetch } from "../lib/api";
import type { Profile } from "../lib/types";

const FIELDS = [
  {
    key: "seller_name",
    label: "Your name",
    hint: "Used to sign off follow-up emails.",
    rows: 1,
    placeholder: "Alex Parker",
  },
  {
    key: "company",
    label: "Your company",
    hint: "",
    rows: 1,
    placeholder: "Brightline Software",
  },
  {
    key: "offering",
    label: "What you actually sell",
    hint: "Describe it like you'd say it out loud to a stranger.",
    rows: 4,
    placeholder:
      "Job management software for trade businesses. One plan, $99 a month per team, includes quoting, scheduling and invoicing.",
  },
  {
    key: "icp",
    label: "Who you sell to",
    hint: "The people who buy, and what they're usually trying to achieve.",
    rows: 3,
    placeholder:
      "Owner-operators of plumbing, electrical and building firms with 3-20 staff who still run jobs off a whiteboard.",
  },
  {
    key: "pricing",
    label: "Pricing",
    hint: "Include anything you can and can't discount.",
    rows: 3,
    placeholder: "$99 a month per team. Annual gets two months free. No discounting beyond that.",
  },
  {
    key: "differentiators",
    label: "Why people pick you over the alternatives",
    hint: "",
    rows: 3,
    placeholder:
      "Set up in a day, local support, and no per-user pricing so the whole crew can be on it.",
  },
  {
    key: "common_objections",
    label: "What people push back on",
    hint: "The things you hear over and over.",
    rows: 3,
    placeholder:
      "\"We already use spreadsheets.\" \"My guys won't use an app.\" \"We're too busy to switch.\"",
  },
] as const;

export function ProfileForm({ initial }: { initial: Profile }) {
  const [form, setForm] = useState<Record<string, string>>({
    seller_name: initial.seller_name ?? "",
    company: initial.company ?? "",
    offering: initial.offering ?? "",
    icp: initial.icp ?? "",
    pricing: initial.pricing ?? "",
    differentiators: initial.differentiators ?? "",
    common_objections: initial.common_objections ?? "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    const res = await earpieceFetch("/profile", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) {setTimeout(() => setState("idle"), 2500);}
  }

  return (
    <form onSubmit={save} className="mt-8 space-y-6">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="mb-1.5 block text-sm text-muted">{f.label}</label>
          {f.hint && <p className="mb-2 text-xs text-faint">{f.hint}</p>}
          {f.rows === 1 ? (
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none transition placeholder:text-faint focus:border-brand"
            />
          ) : (
            <textarea
              rows={f.rows}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 outline-none transition placeholder:text-faint focus:border-brand"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-4 pb-10">
        <button
          disabled={state === "saving"}
          className="rounded-xl bg-brand px-6 py-3 font-semibold text-ink transition hover:brightness-110 disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" && <span className="text-sm text-signal">Saved.</span>}
        {state === "error" && (
          <span className="text-sm text-warning">Didn&rsquo;t save. Try again.</span>
        )}
      </div>
    </form>
  );
}
