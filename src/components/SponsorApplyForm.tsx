"use client";

import { useState } from "react";

const ENDPOINT = `${process.env.NEXT_PUBLIC_FUNCTIONS_URL ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`}/sponsor-apply`;

const SLOTS = [
  { value: "banner", label: "Park banners", hint: "Start gate, walls, finish" },
  { value: "feature_wrap", label: "Feature wraps", hint: "Rails, box tops, kickers" },
  { value: "board", label: "Sponsored board", hint: "Players ride it, first person" },
  { value: "binding", label: "Sponsored bindings", hint: "Strap + highback art" },
  { value: "event_title", label: "Night session title", hint: '"Presented by" the event' },
];

const BUDGETS = ["Under $500 / mo", "$500 to $2,000 / mo", "$2,000 to $5,000 / mo", "$5,000+ / mo", "Not sure yet"];

export function SponsorApplyForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(e.currentTarget);
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > 5 * 1024 * 1024) {
      setState("error");
      return setError("Logo must be under 5 MB.");
    }
    form.set("source_page", window.location.href);
    try {
      const res = await fetch(ENDPOINT, { method: "POST", body: form, headers: { Accept: "application/json" } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setState("done");
    } catch (err) {
      setState("error");
      setError((err as Error).message);
    }
  }

  if (state === "done") {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold">Got it. Thanks!</h2>
        <p className="text-muted mt-2 text-sm">
          We review every sponsor personally. If it&apos;s a fit, you&apos;ll get an email invite to the sponsor portal, where you upload art and track results.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 grid md:grid-cols-2 gap-4" encType="multipart/form-data">
      <div><label className="label" htmlFor="company_name">Company</label><input id="company_name" name="company_name" required className="input" /></div>
      <div><label className="label" htmlFor="website_url">Website</label><input id="website_url" name="website_url" className="input" placeholder="yourbrand.com" /></div>
      <div><label className="label" htmlFor="contact_name">Your name</label><input id="contact_name" name="contact_name" required className="input" autoComplete="name" /></div>
      <div><label className="label" htmlFor="contact_email">Work email</label><input id="contact_email" name="contact_email" type="email" required className="input" autoComplete="email" /></div>

      <fieldset className="md:col-span-2">
        <legend className="label">What are you interested in?</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {SLOTS.map((s) => (
            <label key={s.value} className="flex items-start gap-3 rounded-lg border border-line p-3 cursor-pointer hover:border-muted">
              <input type="checkbox" name="interested_slots" value={s.value} className="mt-1" />
              <span><span className="text-sm font-medium block">{s.label}</span><span className="text-xs text-muted">{s.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="budget_range">Monthly budget</label>
        <select id="budget_range" name="budget_range" className="select" defaultValue="">
          <option value="" disabled>Pick one</option>{BUDGETS.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="logo">Logo (optional)</label>
        <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,application/pdf" className="input" />
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="message">Anything else?</label>
        <textarea id="message" name="message" rows={4} className="textarea" placeholder="Goals, timing, the audience you want to reach" />
      </div>

      {/* Honeypot: real people never see or fill this. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="company_fax">Fax</label><input id="company_fax" name="company_fax" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Apply to sponsor"}</button>
        {state === "error" && <p className="text-sm text-bad">{error}</p>}
      </div>
    </form>
  );
}
