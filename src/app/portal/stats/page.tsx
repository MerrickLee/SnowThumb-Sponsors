import { TrackOnMount } from "@/components/Track";
import type { Metadata } from "next";
import { requireSponsor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/Shell";
import { RangePicker } from "@/components/RangePicker";
import { StatsPanel } from "@/components/StatsPanel";
import { easternDate } from "@/lib/stats";
import type { DailyStat } from "@/lib/types";

export const metadata: Metadata = { title: "Performance" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PortalStats({ searchParams }: PageProps<"/portal/stats">) {
  await requireSponsor();
  const sp = await searchParams;
  const to = typeof sp.to === "string" && DATE.test(sp.to) ? sp.to : easternDate(0);
  const from = typeof sp.from === "string" && DATE.test(sp.from) ? sp.from : easternDate(-29);
  const campaign = typeof sp.campaign === "string" ? sp.campaign : "";

  const supabase = await createClient();
  let q = supabase.from("campaign_daily_stats").select("*").gte("day", from).lte("day", to).order("day").limit(10000);
  if (campaign) q = q.eq("campaign_id", campaign);
  const [{ data: rows }, { data: campaigns }, { data: slots }] = await Promise.all([
    q,
    supabase.from("campaigns").select("id, name").order("created_at", { ascending: false }),
    supabase.from("slots").select("id, label"),
  ]);

  const names = Object.fromEntries((campaigns ?? []).map((c) => [c.id, c.name]));
  const slotLabels = Object.fromEntries((slots ?? []).map((s) => [s.id, s.label]));

  return (
    <>
      <TrackOnMount event="stats_viewed" props={{ from, to, campaign_filter: typeof sp.campaign === "string" ? "one" : "all" }} />
      <PageHeader eyebrow="Performance" title="How players see your brand" sub="An impression counts when your art is on screen for at least one second during a run. Updated hourly." />
      <div className="mb-6"><RangePicker from={from} to={to} campaigns={campaigns ?? []} /></div>
      <StatsPanel rows={(rows ?? []) as DailyStat[]} from={from} to={to} names={names} slotLabels={slotLabels}
        csvName={`snowthumb-performance-${from}-to-${to}.csv`} />
    </>
  );
}
