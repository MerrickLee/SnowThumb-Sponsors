"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/portal/actions";
import type { Campaign, Sponsor } from "@/lib/types";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) : "";

export function CampaignForm({
  action, campaign, sponsors, disabled,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  campaign?: Campaign;
  sponsors?: Sponsor[];
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [start, setStart] = useState(day(campaign?.starts_at ?? null));
  const [dirty, setDirty] = useState(false);

  return (
    <form action={formAction} onChange={() => setDirty(true)} onSubmit={() => setDirty(false)} className="card p-5 md:p-6 grid md:grid-cols-2 gap-5 [&>*]:min-w-0">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      {sponsors && sponsors.length > 0 && (
        sponsors.length === 1 ? (
          <input type="hidden" name="sponsor_id" value={sponsors[0].id} />
        ) : (
          <div className="md:col-span-2">
            <label className="label" htmlFor="sponsor_id">Brand<span className="req" aria-hidden>*</span></label>
            <select id="sponsor_id" name="sponsor_id" className="select" required>
              {sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )
      )}
      <div className="md:col-span-2">
        <label className="label" htmlFor="name">Campaign name<span className="req" aria-hidden>*</span></label>
        <input id="name" name="name" className="input" required maxLength={80} defaultValue={campaign?.name} disabled={disabled} placeholder="Winter park takeover" />
        <p className="hint">Only you and SnowThumb see this name.</p>
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="link_url">Link players visit<span className="req" aria-hidden>*</span></label>
        <input id="link_url" name="link_url" className="input" inputMode="url" defaultValue={campaign?.link_url ?? ""} disabled={disabled} placeholder="https://yourbrand.com/snowthumb" />
        <p className="hint">Opens from the gear shop and the post-run card, never mid-run. We add UTM tags so you can see SnowThumb traffic in your analytics.</p>
      </div>
      <div>
        <label className="label" htmlFor="starts_at">Start date <span className="font-normal text-muted">optional</span></label>
        <input id="starts_at" name="starts_at" type="date" className="input" defaultValue={start} disabled={disabled} onChange={(e) => setStart(e.target.value)} />
        <p className="hint">Leave blank to start as soon as it&apos;s approved.</p>
      </div>
      <div>
        <label className="label" htmlFor="ends_at">End date <span className="font-normal text-muted">optional</span></label>
        <input id="ends_at" name="ends_at" type="date" className="input" min={start || undefined} defaultValue={day(campaign?.ends_at ?? null)} disabled={disabled} />
        <p className="hint">Leave blank to run until you pause it.</p>
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="notes">Notes for our team <span className="font-normal text-muted">optional</span></label>
        <textarea id="notes" name="notes" rows={3} className="textarea" defaultValue={campaign?.notes ?? ""} disabled={disabled} placeholder="Anything we should know: launch timing, which placements matter most…" />
      </div>
      {!disabled && (
        <div className="md:col-span-2 flex flex-wrap items-center gap-3" aria-live="polite">
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : campaign ? "Save details" : "Create campaign and add art"}</button>
          {state.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
          {state.ok && !dirty && <p className="text-sm text-ok">✓ {state.ok}</p>}
          {dirty && campaign && <p className="text-sm text-muted">Unsaved changes</p>}
        </div>
      )}
    </form>
  );
}

export function SubmitButton({ action, id, ready }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; id: string; ready: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col sm:flex-row sm:items-center gap-3" aria-live="polite">
      <input type="hidden" name="id" value={id} />
      {state.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-ok">✓ {state.ok}</p>}
      <button className="btn btn-primary" disabled={pending || !ready} aria-disabled={!ready}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
