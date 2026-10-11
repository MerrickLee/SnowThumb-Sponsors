"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/app/portal/actions";
import {
  GEAR_TERMS, MAX_START_AHEAD_DAYS, easternToday, usd, gearMonthlyCents, gearBreakdown, type GearTerm,
} from "@/lib/pricing";
import { deviceId, track } from "@/lib/analytics";

const pretty = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Month or year in the in-game gear shop. extendFrom = last day of a listing that's still running. */
export function BookGear({
  action, campaignId, extendFrom, gearKinds = [],
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  campaignId: string;
  extendFrom?: string | null;
  gearKinds?: string[];
}) {
  const today = easternToday();
  const [state, formAction, pending] = useActionState(action, {});
  const device = useRef<HTMLInputElement>(null);
  // The server already logs the failure; this one shows what the sponsor saw on the page.
  useEffect(() => { if (state.error) track("checkout_error_shown", { campaign_id: campaignId, product: "gear", code: state.code ?? "unknown" }); }, [state, campaignId]);
  const [term, setTerm] = useState<GearTerm>("month");
  const [start, setStart] = useState(today);

  const monthlyRate = gearMonthlyCents(gearKinds.length > 0 ? gearKinds : ["binding"]);
  const breakdown = gearBreakdown(gearKinds.length > 0 ? gearKinds : ["binding"]);
  const isOnlyBoard = gearKinds.length === 1 && gearKinds[0] === "board";
  const costCents = term === "year" ? (isOnlyBoard ? GEAR_TERMS.year.cents : monthlyRate * 12) : monthlyRate;

  const tDays = term === "year" ? 365 : 30;
  const tLabel = term === "year" ? "1 year" : "1 month";
  const first = extendFrom ? addDays(extendFrom, 1) : start;
  const last = addDays(first, tDays - 1);

  return (
    <form action={formAction} onSubmitCapture={() => { if (device.current) device.current.value = deviceId() ?? ""; track("checkout_started", { campaign_id: campaignId, product: "gear", term, currency: "USD", value: costCents / 100, extend: !!extendFrom }); }}
      className="card p-5 md:p-6 grid gap-5">
      <input type="hidden" name="id" value={campaignId} />
      <input ref={device} type="hidden" name="amp_device_id" defaultValue="" />
      <input type="hidden" name="product" value="gear" />
      <input type="hidden" name="term" value={term} />
      <input type="hidden" name="start_on" value={extendFrom ? today : start} />

      {breakdown.length > 0 && (
        <div>
          <p className="label">Gear included in listing</p>
          <div className="flex flex-wrap gap-2">
            {breakdown.map((b) => (
              <span key={b.label} className="badge bg-surface-2 border border-line text-xs font-semibold py-1 px-2.5">
                {b.label}: {usd(b.cents)} / 30 days
              </span>
            ))}
          </div>
        </div>
      )}

      <fieldset>
        <legend className="label">How long in the shop?</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(GEAR_TERMS) as GearTerm[]).map((k) => {
            const on = term === k;
            const price = k === "year" ? (isOnlyBoard ? GEAR_TERMS.year.cents : monthlyRate * 12) : monthlyRate;
            const blurb = k === "year" ? "365 days in the shop" : "30 days in the shop ($200 each for bindings/boots)";
            return (
              <button key={k} type="button" onClick={() => setTerm(k)} aria-pressed={on}
                className={`text-left rounded-lg border p-4 transition ${on ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2"}`}>
                <p className="font-bold">{k === "year" ? "1 year" : "1 month (30 days)"}</p>
                <p className="title text-2xl">{usd(price)}</p>
                <p className="text-sm text-muted">{blurb}</p>
              </button>
            );
          })}
        </div>
      </fieldset>

      {!extendFrom && (
        <div className="max-w-xs">
          <label className="label" htmlFor="gear_start_on">Start date</label>
          <input id="gear_start_on" type="date" className="input" min={today} max={easternToday(MAX_START_AHEAD_DAYS)}
            value={start} onChange={(e) => setStart(e.target.value || today)} />
          <p className="hint">{start === today ? "In the shop as soon as payment goes through." : "Starts at midnight Eastern."}</p>
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface-2 p-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{tLabel} in the gear shop</p>
          <p className="title text-3xl">{usd(costCents)}</p>
          <p className="text-sm text-muted mt-1">{extendFrom ? "Adds" : "Listed"} {pretty(first)} – {pretty(last)}</p>
        </div>
        <div className="flex flex-col items-end gap-2" aria-live="polite">
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Opening checkout…" : extendFrom ? `Add ${tLabel}` : `Pay ${usd(costCents)} and list it`}
          </button>
          <p className="text-xs text-muted">Secure checkout by Stripe</p>
        </div>
      </div>
      {state.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      <ul className="text-sm text-muted list-disc pl-5 space-y-1">
        <li>SnowThumb Pro players can pick your gear right away, free.</li>
        <li>Free players unlock it with Cred they earn riding.</li>
        <li>Binding and boots are $200 each up to 30 days. After 30 days, extend for another $200 each.</li>
        <li>When the listing ends it leaves the shop. Players who already unlocked it with Cred keep it.</li>
      </ul>
    </form>
  );
}
