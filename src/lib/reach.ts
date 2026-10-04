import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { easternDayToIso } from "@/lib/format";

export type Reach = {
  /** Distinct runs where the art was on screen for at least 1 second. */
  runsShown: number;
  /** Distinct players (app installs) who saw it. */
  players: number;
  runsByDay: Record<string, number>;
  byCampaign: Record<string, { runsShown: number; players: number }>;
};

const empty = (): Reach => ({ runsShown: 0, players: 0, runsByDay: {}, byCampaign: {} });

/**
 * Reach for the given campaigns over an Eastern-time date range. Counts each run and
 * each player once, however many placements showed the art in that run.
 * `campaignIds` must already be limited to what the caller may see (query them with
 * the caller's own client first); this reads raw events with the service role.
 */
export async function getReach(campaignIds: string[], from: string, to: string): Promise<Reach> {
  const out = empty();
  if (campaignIds.length === 0) return out;
  const admin = createAdminClient();
  const runs = new Set<string>(), players = new Set<string>();
  const dayRuns = new Map<string, Set<string>>();
  const camp = new Map<string, { runs: Set<string>; players: Set<string> }>();

  const PAGE = 1000, MAX = 100_000;
  for (let offset = 0; offset < MAX; offset += PAGE) {
    const { data, error } = await admin.from("events")
      .select("run_id, install_id, campaign_id, occurred_at")
      .eq("type", "impression").neq("platform", "editor")
      .in("campaign_id", campaignIds)
      .gte("occurred_at", easternDayToIso(from, "start"))
      .lte("occurred_at", easternDayToIso(to, "end"))
      .order("id").range(offset, offset + PAGE - 1);
    if (error || !data) break;
    for (const e of data) {
      const day = new Date(e.occurred_at).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      const c = camp.get(e.campaign_id) ?? { runs: new Set<string>(), players: new Set<string>() };
      camp.set(e.campaign_id, c);
      if (e.install_id) { players.add(e.install_id); c.players.add(e.install_id); }
      if (e.run_id) {
        runs.add(e.run_id); c.runs.add(e.run_id);
        const s = dayRuns.get(day) ?? new Set<string>(); s.add(e.run_id); dayRuns.set(day, s);
      }
    }
    if (data.length < PAGE) break;
  }

  out.runsShown = runs.size;
  out.players = players.size;
  for (const [d, s] of dayRuns) out.runsByDay[d] = s.size;
  for (const [id, c] of camp) out.byCampaign[id] = { runsShown: c.runs.size, players: c.players.size };
  return out;
}
