"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/portal/actions";
import { DAY_PRESETS, DAY_RATE_CENTS, MAX_DAYS, MAX_START_AHEAD_DAYS, MIN_DAYS, easternToday, totalCents, usd } from "@/lib/pricing";
import { track } from "@/lib/analytics";

const pretty = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Pick days (+ start date for a fresh run) and go to Stripe. When the campaign is
 * already running or scheduled, extendFrom is its current last day and new days
 * are added on the end, so there's no start date to pick.
 */
export function BookDays({
  action, campaignId, extendFrom,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  campaignId: string;
  extendFrom?: string | null; // YYYY-MM-DD, Eastern
}) {
  const today = easternToday();
  const [state, formAction, pending] = useActionState(action, {});
  const [days, setDays] = useState(7);
  const [start, setStart] = useState(today);
  const valid = Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS;
  const first = extendFrom ? addDays(extendFrom, 1) : start;
  const last = addDays(first, Math.max(days, 1) - 1);

  return (
    <form action={formAction} onSubmit={() => track("checkout_started", { campaign_id: campaignId, product: "placements", days, currency: "USD", value: totalCents(days) / 100, extend: !!extendFrom })}
      className="card p-5 md:p-6 grid gap-5">
      <input type="hidden" name="id" value={campaignId} />
      <input type="hidden" name="product" value="placements" />
      <input type="hidden" name="start_on" value={extendFrom ? today : start} />

      <fieldset>
        <legend className="label">How many days?</legend>
        <div className="flex flex-wrap items-center gap-2">
          {DAY_PRESETS.map((n) => (
            <button key={n} type="button" onClick={() => setDays(n)} aria-pressed={days === n}
              className={`btn btn-sm ${days === n ? "btn-primary" : ""}`}>{n} days</button>
          ))}
          <label className="sr-only" htmlFor="days">Custom number of days</label>
          <input id="days" name="days" type="number" inputMode="numeric" min={MIN_DAYS} max={MAX_DAYS} step={1}
            className="input w-24" value={Number.isNaN(days) ? "" : days} onChange={(e) => setDays(e.target.valueAsNumber)} />
          <span className="text-sm text-muted">days</span>
        </div>
        <p className="hint">{usd(DAY_RATE_CENTS)} a day, {MIN_DAYS} to {MAX_DAYS} days per booking. You can add more days any time.</p>
      </fieldset>

      {!extendFrom && (
        <div className="max-w-xs">
          <label className="label" htmlFor="start_on_pick">Start date</label>
          <input id="start_on_pick" type="date" className="input" min={today} max={easternToday(MAX_START_AHEAD_DAYS)}
            value={start} onChange={(e) => setStart(e.target.value || today)} />
          <p className="hint">{start === today ? "Starts as soon as payment goes through." : "Starts at midnight Eastern."}</p>
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface-2 p-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{valid ? `${days} day${days === 1 ? "" : "s"} × ${usd(DAY_RATE_CENTS)}` : "Pick a number of days"}</p>
          <p className="title text-3xl">{valid ? usd(totalCents(days)) : "—"}</p>
          {valid && <p className="text-sm text-muted mt-1">{extendFrom ? "Adds" : "Runs"} {pretty(first)} – {pretty(last)}</p>}
        </div>
        <div className="flex flex-col items-end gap-2" aria-live="polite">
          <button className="btn btn-primary" disabled={pending || !valid}>
            {pending ? "Opening checkout…" : extendFrom ? `Add ${valid ? days : ""} days` : `Pay ${valid ? usd(totalCents(days)) : ""} and go live`}
          </button>
          <p className="text-xs text-muted">Secure checkout by Stripe</p>
        </div>
      </div>
      {state.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      <p className="text-sm text-muted">
        While you&apos;re in a run, your brand owns every banner on the course. When other sponsors book the same
        days, players rotate between sponsors every few runs, so a booked day is a share of that day&apos;s runs.
        Your stats page shows exactly how many runs you were in.
      </p>
    </form>
  );
}
