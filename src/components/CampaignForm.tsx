"use client";

import { useActionState } from "react";
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
  return (
    <form action={formAction} className="card p-5 grid md:grid-cols-2 gap-4">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      {sponsors && sponsors.length > 0 && (
        sponsors.length === 1 ? (
          <input type="hidden" name="sponsor_id" value={sponsors[0].id} />
        ) : (
          <div className="md:col-span-2">
            <label className="label" htmlFor="sponsor_id">Sponsor</label>
            <select id="sponsor_id" name="sponsor_id" className="select" required>
              {sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )
      )}
      <div className="md:col-span-2">
        <label className="label" htmlFor="name">Campaign name</label>
        <input id="name" name="name" className="input" required defaultValue={campaign?.name} disabled={disabled} placeholder="Winter 2026 park takeover" />
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="link_url">Link players visit</label>
        <input id="link_url" name="link_url" className="input" defaultValue={campaign?.link_url ?? ""} disabled={disabled} placeholder="https://yourbrand.com/snowthumb" />
        <p className="text-xs text-muted mt-1">Opens from the gear shop and post-run card, never mid-run. We add UTM tags automatically.</p>
      </div>
      <div>
        <label className="label" htmlFor="starts_at">Start date</label>
        <input id="starts_at" name="starts_at" type="date" className="input" defaultValue={day(campaign?.starts_at ?? null)} disabled={disabled} />
      </div>
      <div>
        <label className="label" htmlFor="ends_at">End date</label>
        <input id="ends_at" name="ends_at" type="date" className="input" defaultValue={day(campaign?.ends_at ?? null)} disabled={disabled} />
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="notes">Notes for our team</label>
        <textarea id="notes" name="notes" rows={3} className="textarea" defaultValue={campaign?.notes ?? ""} disabled={disabled} />
      </div>
      {!disabled && (
        <div className="md:col-span-2 flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : campaign ? "Save changes" : "Create campaign"}</button>
          {state.error && <p className="text-sm text-bad">{state.error}</p>}
          {state.ok && <p className="text-sm text-ok">{state.ok}</p>}
        </div>
      )}
    </form>
  );
}

export function SubmitButton({ action, id }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; id: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit for review"}</button>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.ok && <p className="text-sm text-ok">{state.ok}</p>}
    </form>
  );
}
