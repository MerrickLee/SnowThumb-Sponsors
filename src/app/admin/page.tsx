import { getReach } from "@/lib/reach";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/Shell";
import { RangePicker } from "@/components/RangePicker";
import { StatsPanel } from "@/components/StatsPanel";
import { easternDate, fmt, isoAgo } from "@/lib/stats";
import { env } from "@/lib/env";
import type { DailyStat } from "@/lib/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminOverview({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const to = typeof sp.to === "string" && DATE.test(sp.to) ? sp.to : easternDate(0);
  const from = typeof sp.from === "string" && DATE.test(sp.from) ? sp.from : easternDate(-29);
  const campaign = typeof sp.campaign === "string" ? sp.campaign : "";

  const supabase = await createClient();
  const hourAgo = isoAgo(3600_000);
  const dayAgo = isoAgo(86400_000);
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);

  let statsQ = supabase.from("campaign_daily_stats").select("*").gte("day", from).lte("day", to).order("day").limit(20000);
  if (campaign) statsQ = statsQ.eq("campaign_id", campaign);

  const [newApps, inReview, live, evHour, evDay, evIos, evAndroid, evEditor, statsRes, campaignsRes, slotsRes, manifest] =
    await Promise.all([
      count(supabase.from("sponsor_applications").select("id", { count: "exact", head: true }).eq("status", "new")),
      count(supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "submitted")),
      count(supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "approved")),
      count(supabase.from("events").select("id", { count: "exact", head: true }).gte("received_at", hourAgo)),
      count(supabase.from("events").select("id", { count: "exact", head: true }).gte("received_at", dayAgo)),
      count(supabase.from("events").select("id", { count: "exact", head: true }).gte("received_at", dayAgo).eq("platform", "ios")),
      count(supabase.from("events").select("id", { count: "exact", head: true }).gte("received_at", dayAgo).eq("platform", "android")),
      count(supabase.from("events").select("id", { count: "exact", head: true }).gte("received_at", dayAgo).eq("platform", "editor")),
      statsQ,
      supabase.from("campaigns").select("id, name").order("created_at", { ascending: false }),
      supabase.from("slots").select("id, label"),
      fetch(`${env.functionsUrl}/manifest`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    ]);

  const allIds = (campaignsRes.data ?? []).map((c) => c.id);
  const reach = await getReach(campaign ? allIds.filter((id) => id === campaign) : allIds, from, to);
  const names = Object.fromEntries((campaignsRes.data ?? []).map((c) => [c.id, c.name]));
  const slotLabels = Object.fromEntries((slotsRes.data ?? []).map((s) => [s.id, s.label]));

  return (
    <>
      <PageHeader title="Overview" sub="Everything across all sponsors." />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
        <Tile href="/admin/applications" label="New applications" value={newApps} hot={newApps > 0} />
        <Tile href="/admin/review" label="Waiting for review" value={inReview} hot={inReview > 0} />
        <Tile href="/admin/campaigns" label="Approved campaigns" value={live} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card p-4">
          <h2 className="font-semibold">Event health</h2>
          <p className="text-xs text-muted mb-3">Raw events received from the app.</p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm num">
            <dt className="text-muted">Last hour</dt><dd className="text-right">{fmt(evHour)}</dd>
            <dt className="text-muted">Last 24h</dt><dd className="text-right">{fmt(evDay)}</dd>
            <dt className="text-muted">iOS (24h)</dt><dd className="text-right">{fmt(evIos)}</dd>
            <dt className="text-muted">Android (24h)</dt><dd className="text-right">{fmt(evAndroid)}</dd>
            <dt className="text-muted">Unity editor (24h, excluded from reports)</dt><dd className="text-right">{fmt(evEditor)}</dd>
          </dl>
        </div>
        <div className="card p-4 min-w-0">
          <h2 className="font-semibold">Live manifest</h2>
          <p className="text-xs text-muted mb-3">Exactly what the app downloads right now.</p>
          {manifest ? (
            <>
              <p className="text-sm mb-2 num">
                {manifest.slots?.length ?? 0} slots with art · {manifest.gear?.length ?? 0} gear · {manifest.challenges?.length ?? 0} challenges
              </p>
              <pre className="text-xs bg-bg border border-line rounded-md p-3 max-h-56 overflow-auto">{JSON.stringify(manifest, null, 2)}</pre>
            </>
          ) : (
            <p className="text-sm text-bad">Couldn&apos;t reach the manifest endpoint.</p>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">All-sponsor performance</h2>
      <div className="mb-6"><RangePicker from={from} to={to} campaigns={campaignsRes.data ?? []} /></div>
      <StatsPanel rows={(statsRes.data ?? []) as DailyStat[]} from={from} to={to} names={names} slotLabels={slotLabels}
        csvName={`snowthumb-all-sponsors-${from}-to-${to}.csv`} reach={reach} />
    </>
  );
}

function Tile({ href, label, value, hot }: { href: string; label: string; value: number; hot?: boolean }) {
  return (
    <Link href={href} className={`card p-3 sm:p-4 hover:border-muted ${hot ? "border-accent/60" : ""}`}>
      <p className="text-[11px] sm:text-xs text-muted uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-3xl font-semibold mt-1 num ${hot ? "text-accent" : ""}`}>{value}</p>
    </Link>
  );
}
