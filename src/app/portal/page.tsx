import Link from "next/link";
import { requireSponsor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { fmt } from "@/lib/stats";
import type { Campaign } from "@/lib/types";
import { campaignDates as dates } from "@/lib/format";

export default async function PortalHome() {
  const s = await requireSponsor();
  const supabase = await createClient();
  const [{ data: campaigns }, { data: totals }] = await Promise.all([
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("campaign_stats_totals").select("campaign_id, impressions, clicks, gear_equips"),
  ]);
  const t = Object.fromEntries((totals ?? []).map((r) => [r.campaign_id, r]));
  const sponsorName = Object.fromEntries(s.sponsors.map((x) => [x.id, x.name]));
  const list = (campaigns ?? []) as Campaign[];

  return (
    <>
      <PageHeader
        title={s.sponsors.length === 1 ? s.sponsors[0].name : "Your campaigns"}
        sub="Upload art, submit it for review, and track how players see it. Approved art goes live in the app without an app update."
        action={<Link href="/portal/campaigns/new" className="btn btn-primary">New campaign</Link>}
      />
      {list.length === 0 ? (
        <Empty>No campaigns yet. Start one to pick your placements and upload art.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>{s.sponsors.length > 1 && <th>Sponsor</th>}<th>Status</th><th>Dates</th>
                <th className="text-right">Impr.</th><th className="text-right">Clicks</th><th className="text-right">Equips</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><Link className="link" href={`/portal/campaigns/${c.id}`}>{c.name}</Link></td>
                  {s.sponsors.length > 1 && <td className="text-muted">{sponsorName[c.sponsor_id]}</td>}
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-muted text-sm num">{dates(c)}</td>
                  <td className="text-right num">{fmt(t[c.id]?.impressions ?? 0)}</td>
                  <td className="text-right num">{fmt(t[c.id]?.clicks ?? 0)}</td>
                  <td className="text-right num">{fmt(t[c.id]?.gear_equips ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
