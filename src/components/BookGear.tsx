"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/portal/actions";
import { GEAR_TERMS, MAX_START_AHEAD_DAYS, easternToday, usd, type GearTerm } from "@/lib/pricing";
import { track } from "@/lib/analytics";

const pretty = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Month or year in the in-game gear shop. extendFrom = last day of a listing that's still running. */
export function BookGear({
  action, campaignId, extendFrom,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  campaignId: string;
  extendFrom?: string | null;
}) {
  const today = easternToday();
  const [state, formAction, pending] = useActionState(action, {});
  const [term, setTerm] = useState<GearTerm>("month");
  const [start, setStart] = useState(today);
  const t = GEAR_TERMS[term];
  const first = extendFrom ? addDays(extendFrom, 1) : start;
  const last = addDays(first, t.days - 1);

  return (
    <form action={formAction} onSubmit={() => track("checkout_started", { campaign_id: campaignId, product: "gear", term, currency: "USD", value: t.cents / 100, extend: !!extendFrom })}
      className="card p-5 md:p-6 grid gap-5">
      <input type="hidden" name="id" value={campaignId} />
      <input type="hidden" name="product" value="gear" />
      <input type="hidden" name="term" value={term} />
      <input type="hidden" name="start_on" value={extendFrom ? today : start} />

      <fieldset>
        <legend className="label">How long in the shop?</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(GEAR_TERMS) as GearTerm[]).map((k) => {
            const o = GEAR_TERMS[k];
            const on = term === k;
            return (
              <button key={k} type="button" onClick={() => setTerm(k)} aria-pressed={on}
                className={`text-left rounded-lg border p-4 transition ${on ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2"}`}>
                <p className="font-bold">{o.label}</p>
                <p className="title text-2xl">{usd(o.cents)}</p>
                <p className="text-sm text-muted">{o.blurb}</p>
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
          <p className="text-sm text-muted">{t.label} in the gear shop</p>
          <p className="title text-3xl">{usd(t.cents)}</p>
          <p className="text-sm text-muted mt-1">{extendFrom ? "Adds" : "Listed"} {pretty(first)} – {pretty(last)}</p>
        </div>
        <div className="flex flex-col items-end gap-2" aria-live="polite">
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Opening checkout…" : extendFrom ? `Add ${t.label}` : `Pay ${usd(t.cents)} and list it`}
          </button>
          <p className="text-xs text-muted">Secure checkout by Stripe</p>
        </div>
      </div>
      {state.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      <ul className="text-sm text-muted list-disc pl-5 space-y-1">
        <li>SnowThumb Pro players can pick your board right away, free.</li>
        <li>Free players unlock it with Cred they earn riding.</li>
        <li>When the listing ends it leaves the shop. Players who already unlocked it with Cred keep it.</li>
      </ul>
    </form>
  );
}
