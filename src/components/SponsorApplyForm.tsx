"use client";

import { track } from "@/lib/analytics";
import { useRef, useState } from "react";

const ENDPOINT = `${process.env.NEXT_PUBLIC_FUNCTIONS_URL ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`}/sponsor-apply`;

const SLOTS = [
  { value: "board", label: "Sponsored board", hint: "Under the rider's feet, first person" },
  { value: "banner", label: "Park banners", hint: "Start gate, walls, finish" },
  { value: "feature_wrap", label: "Feature wraps", hint: "Rails, box tops, kickers" },
  { value: "event_title", label: "Night session title", hint: "“Presented by” the event" },
];

const BUDGETS = ["Under $500 / mo", "$500 to $2,000 / mo", "$2,000 to $5,000 / mo", "$5,000+ / mo", "Not sure yet"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_LOGO = 5 * 1024 * 1024;

type Errors = Partial<Record<"company_name" | "contact_name" | "contact_email" | "logo" | "form", string>>;

export function SponsorApplyForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [logoName, setLogoName] = useState("");
  const [sentTo, setSentTo] = useState("");
  const startedRef = useRef(false);

  function validate(form: FormData): Errors {
    const e: Errors = {};
    if (!String(form.get("company_name") ?? "").trim()) e.company_name = "Enter your company name.";
    if (!String(form.get("contact_name") ?? "").trim()) e.contact_name = "Enter your name.";
    const email = String(form.get("contact_email") ?? "").trim();
    if (!email) e.contact_email = "Enter your work email.";
    else if (!EMAIL.test(email)) e.contact_email = "That email doesn't look right.";
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > MAX_LOGO) e.logo = "Logo must be under 5 MB.";
    return e;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) {
      track("apply_failed", { reason: "validation", fields: Object.keys(v) });
      const first = Object.keys(v)[0];
      ref.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setState("sending");
    form.set("source_page", window.location.href);
    try {
      const res = await fetch(ENDPOINT, { method: "POST", body: form, headers: { Accept: "application/json" } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      track("apply_submitted", {
        interests: form.getAll("interests").map(String),
        budget_range: String(form.get("budget_range") ?? "") || undefined,
        has_logo: form.get("logo") instanceof File && (form.get("logo") as File).size > 0,
      });
      setSentTo(String(form.get("contact_email")));
      setState("done");
    } catch (err) {
      setState("idle");
      track("apply_failed", { reason: "server" });
      setErrors({ form: `${(err as Error).message} You can also email sponsors@snowthumb.com.` });
    }
  }

  if (state === "done") {
    return (
      <div className="card p-6 md:p-8" role="status" aria-live="polite">
        <p className="eyebrow text-ok">Application received</p>
        <h3 className="title text-2xl mt-2">Thanks! You&apos;re on our list.</h3>
        <p className="text-muted mt-2">
          We review every sponsor personally. If it&apos;s a fit, we&apos;ll send an invite to <strong className="text-text">{sentTo}</strong> for
          the sponsor console, where you upload art and track results.
        </p>
        <ol className="mt-5 space-y-2 text-sm">
          <li>1. Watch for an email from SnowThumb (check spam the first time).</li>
          <li>2. Click the invite link to open your console. No password needed.</li>
          <li>3. Pick placements and upload art. We approve, and it goes live in the app.</li>
        </ol>
      </div>
    );
  }

  const field = (name: keyof Errors) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form ref={ref} onSubmit={submit}
      onFocus={(e) => {
        if (startedRef.current) return;
        startedRef.current = true;
        track("apply_started", { first_field: (e.target as unknown as HTMLInputElement).name || undefined });
      }} noValidate className="card p-5 md:p-7 grid md:grid-cols-2 gap-5 [&>*]:min-w-0" encType="multipart/form-data">
      <div>
        <label className="label" htmlFor="company_name">Company<span className="req" aria-hidden>*</span></label>
        <input id="company_name" name="company_name" required autoComplete="organization" className="input" {...field("company_name")} />
        <Err errors={errors} name="company_name" />
      </div>
      <div>
        <label className="label" htmlFor="website_url">Website</label>
        <input id="website_url" name="website_url" className="input" inputMode="url" autoComplete="url" placeholder="yourbrand.com" />
      </div>
      <div>
        <label className="label" htmlFor="contact_name">Your name<span className="req" aria-hidden>*</span></label>
        <input id="contact_name" name="contact_name" required autoComplete="name" className="input" {...field("contact_name")} />
        <Err errors={errors} name="contact_name" />
      </div>
      <div>
        <label className="label" htmlFor="contact_email">Work email<span className="req" aria-hidden>*</span></label>
        <input id="contact_email" name="contact_email" type="email" required autoComplete="email" inputMode="email" className="input" {...field("contact_email")} />
        <Err errors={errors} name="contact_email" />
      </div>

      <fieldset className="md:col-span-2">
        <legend className="label">What are you interested in? <span className="font-normal text-muted">Pick any</span></legend>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {SLOTS.map((s) => (
            <label key={s.value} className="flex items-start gap-3 rounded-lg border border-line p-3.5 cursor-pointer hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="checkbox" name="interested_slots" value={s.value} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
              <span><span className="font-bold block">{s.label}</span><span className="text-sm text-muted">{s.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="budget_range">Monthly budget</label>
        <select id="budget_range" name="budget_range" className="select" defaultValue="">
          <option value="">Choose a range</option>
          {BUDGETS.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <span className="label" id="logo-label">Logo <span className="font-normal text-muted">optional</span></span>
        <label className={`flex items-center gap-3 rounded-lg border border-dashed px-3 min-h-11 cursor-pointer hover:border-accent ${errors.logo ? "border-bad" : "border-[var(--line-strong)]"}`}>
          <span className="btn btn-sm pointer-events-none">Choose file</span>
          <span className="text-sm text-muted truncate">{logoName || "PNG, JPG, SVG or PDF, up to 5 MB"}</span>
          <input name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,application/pdf" className="sr-only" aria-labelledby="logo-label"
            onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? "")} {...field("logo")} />
        </label>
        <Err errors={errors} name="logo" />
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="message">Anything else? <span className="font-normal text-muted">optional</span></label>
        <textarea id="message" name="message" rows={4} className="textarea" placeholder="Goals, timing, the audience you want to reach" />
      </div>

      {/* Honeypot: real people never see or fill this. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="company_fax">Fax</label><input id="company_fax" name="company_fax" tabIndex={-1} autoComplete="off" />
      </div>

      {errors.form && <div className="md:col-span-2 notice notice-bad" role="alert">{errors.form}</div>}

      <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
        <button className="btn btn-primary w-full sm:w-auto" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Apply to sponsor"}
        </button>
        <p className="text-sm text-muted">Takes about two minutes. No commitment.</p>
      </div>
    </form>
  );
}

function Err({ errors, name }: { errors: Errors; name: keyof Errors }) {
  return errors[name] ? <p id={`${name}-error`} className="text-sm text-bad mt-1.5">{errors[name]}</p> : null;
}
