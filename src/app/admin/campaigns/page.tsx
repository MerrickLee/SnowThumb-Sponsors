import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionForm } from "@/components/ActionForm";
import { setCampaignStatus, updateCampaignAdmin } from "@/app/admin/actions";
import type { Campaign } from "@/lib/types";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) : "");

export default async function AdminCampaigns({ searchParams }: PageProps<"/admin/campaigns">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const supabase = await createClient();
  let q = supabase.from("campaigns").select("*, sponsors(name, is_house)").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  const list = (data ?? []) as (Campaign & { sponsors: { name: string; is_house: boolean } })[];
  const filters: [string, string][] = [["", "All"], ["approved", "Live"], ["submitted", "In review"], ["draft", "Draft"], ["rejected", "Sent back"], ["paused", "Paused"], ["archived", "Archived"]];

  return (
    <>
      <PageHeader title="Campaigns" sub="Priority decides who wins a slot (paid 10+, house 0). Weight splits a slot between campaigns at the same priority." />
      <nav aria-label="Filter by status" className="flex gap-2 mb-4 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none]">
        {filters.map(([f, label]) => (
          <Link key={f || "all"} href={f ? `?status=${f}` : "/admin/campaigns"} aria-current={status === f ? "page" : undefined}
            className={`btn btn-sm whitespace-nowrap ${status === f ? "btn-primary" : ""}`}>{label}</Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <Empty title={status ? "Nothing here" : "No campaigns yet"}
          action={status
            ? <Link className="btn" href="/admin/campaigns">Show all campaigns</Link>
            : <Link className="btn btn-primary" href="/admin/house">Start a house campaign</Link>}>
          {status
            ? "No campaigns have this status right now."
            : "Sponsor campaigns appear here once a sponsor starts one. Fill empty placements with your own brands in the meantime."}
        </Empty>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c.id} className="card p-4 grid lg:grid-cols-[1fr_auto] gap-4 items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link className="font-semibold link" href={`/portal/campaigns/${c.id}`}>{c.name}</Link>
                  <span className="text-sm text-muted">{c.sponsors.name}{c.sponsors.is_house ? " (house)" : ""}</span>
                  <StatusBadge status={c.status} />
                </div>
                <ActionForm action={updateCampaignAdmin} submit="Save" submitClass="btn btn-sm"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div><label className="label" htmlFor={`priority-${c.id}`}>Priority</label><input id={`priority-${c.id}`} name="priority" type="number" className="input" defaultValue={c.priority} /></div>
                  <div><label className="label" htmlFor={`weight-${c.id}`}>Weight</label><input id={`weight-${c.id}`} name="weight" type="number" min={1} max={1000} className="input" defaultValue={c.weight} /></div>
                  <div><label className="label" htmlFor={`starts_at-${c.id}`}>Start</label><input id={`starts_at-${c.id}`} name="starts_at" type="date" className="input" defaultValue={day(c.starts_at)} /></div>
                  <div><label className="label" htmlFor={`ends_at-${c.id}`}>End</label><input id={`ends_at-${c.id}`} name="ends_at" type="date" className="input" defaultValue={day(c.ends_at)} /></div>
                </ActionForm>
              </div>
              <div className="flex lg:flex-col gap-2">
                {c.status === "approved" && <StatusButton id={c.id} status="paused" label="Pause" />}
                {c.status === "paused" && c.approved_at && <StatusButton id={c.id} status="approved" label="Resume" />}
                {c.status !== "archived" && <StatusButton id={c.id} status="archived" label="Archive" danger />}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StatusButton({ id, status, label, danger }: { id: string; status: string; label: string; danger?: boolean }) {
  return (
    <form action={setCampaignStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <button className={`btn btn-sm w-full ${danger ? "btn-danger" : ""}`}>{label}</button>
    </form>
  );
}
