import { getReach } from "@/lib/reach";
import { easternDate } from "@/lib/stats";
import Link from "next/link";
import { requireSponsor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { fmt } from "@/lib/stats";
import { campaignDates } from "@/lib/format";
import type { Campaign } from "@/lib/types";

const NEXT_STEP: Record<Campaign["status"], string> = {
  draft: "Add art and submit for review",
  rejected: "Review our notes and resubmit",
  submitted: "We're reviewing it",
  approved: "Live in the app",
  paused: "Paused by SnowThumb",
  archived: "Archived",
};

export default async function PortalHome() {
  const s = await requireSponsor();
  const supabase = await createClient();
  const [{ data: campaigns }, { data: totals }] = await Promise.all([
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("campaign_stats_totals").select("campaign_id, impressions, clicks, gear_equips"),
  ]);
  const t = Object.fromEntries((totals ?? []).map((r) => [r.campaign_id, r]));
  const reach = await getReach((campaigns ?? []).map((c) => c.id), "2026-01-01", easternDate(0));
  const sponsorName = Object.fromEntries(s.sponsors.map((x) => [x.id, x.name]));
  const list = (campaigns ?? []) as Campaign[];
  const needsAction = list.filter((c) => c.status === "draft" || c.status === "rejected");
  const name = s.sponsors.length === 1 ? s.sponsors[0].name : "Your campaigns";

  if (list.length === 0) return <Welcome name={s.sponsors[0]?.name} />;

  return (
    <>
      <PageHeader eyebrow="Sponsor console" title={name}
        sub="Approved art reaches players on their next app open. No app update needed."
        action={<Link href="/portal/campaigns/new" className="btn btn-primary">New campaign</Link>} />

      {needsAction.length > 0 && (
        <div className="notice notice-info mb-6 flex flex-wrap items-center justify-between gap-3">
          <span><strong>{needsAction.length} campaign{needsAction.length > 1 ? "s" : ""}</strong> need{needsAction.length === 1 ? "s" : ""} your attention.</span>
          <Link className="link" href={`/portal/campaigns/${needsAction[0].id}`}>Open {needsAction[0].name}</Link>
        </div>
      )}

      <ul className="grid gap-3">
        {list.map((c) => (
          <li key={c.id}>
            <Link href={`/portal/campaigns/${c.id}`} className="card p-4 md:p-5 grid md:grid-cols-[1fr_auto] gap-4 items-center hover:border-accent transition-colors">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-lg truncate">{c.name}</h2>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-muted mt-1">
                  {s.sponsors.length > 1 && <>{sponsorName[c.sponsor_id]} · </>}
                  {campaignDates(c)} · {NEXT_STEP[c.status]}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-4 md:gap-8 text-right">
                <Stat label="Runs shown" value={reach.byCampaign[c.id]?.runsShown} />
                <Stat label="Impressions" value={t[c.id]?.impressions} />
                <Stat label="Clicks" value={t[c.id]?.clicks} />
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Stat({ label, value }: { label: string; value?: number | null }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-black text-xl num">{fmt(Number(value ?? 0))}</dd>
    </div>
  );
}

function Welcome({ name }: { name?: string }) {
  const steps = [
    { t: "Create a campaign", d: "Name it, add the link players will visit, and set dates." },
    { t: "Upload your art", d: "Pick placements and upload art. We check sizes before you upload." },
    { t: "Submit for review", d: "We approve it, usually quickly, and it goes live on players' next app open." },
    { t: "Watch it perform", d: "Runs your brand was in, players reached, impressions, gear unlocks and clicks." },
  ];
  return (
    <>
      <PageHeader eyebrow="Welcome" title={name ? `Welcome, ${name}.` : "Welcome to SnowThumb."}
        sub="Here's how sponsoring works. Your first campaign takes about ten minutes." />
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <li key={s.t} className="card p-5">
            <p className="text-sky font-black text-2xl num">0{i + 1}</p>
            <p className="font-bold text-lg mt-2">{s.t}</p>
            <p className="text-muted text-sm mt-1">{s.d}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3 mt-8">
        <Link href="/portal/campaigns/new" className="btn btn-primary">Create your first campaign</Link>
        <Link href="/portal/guide" className="btn">Read the art guide</Link>
      </div>
    </>
  );
}
