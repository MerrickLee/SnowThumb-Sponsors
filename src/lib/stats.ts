import type { DailyStat } from "@/lib/types";

export type Totals = {
  impressions: number;
  viewMs: number;
  clicks: number;
  gearViews: number;
  gearUnlocks: number;
  gearEquips: number;
  runsWithGear: number;
  challengeStarts: number;
  challengeCompletes: number;
};

export const emptyTotals = (): Totals => ({
  impressions: 0, viewMs: 0, clicks: 0, gearViews: 0, gearUnlocks: 0,
  gearEquips: 0, runsWithGear: 0, challengeStarts: 0, challengeCompletes: 0,
});

export function addRow(t: Totals, r: DailyStat) {
  t.impressions += r.impressions;
  t.viewMs += Number(r.view_ms);
  t.clicks += r.clicks;
  t.gearViews += r.gear_views;
  t.gearUnlocks += r.gear_unlocks;
  t.gearEquips += r.gear_equips;
  t.runsWithGear += r.runs_with_gear;
  t.challengeStarts += r.challenge_starts;
  t.challengeCompletes += r.challenge_completes;
  return t;
}

export function totals(rows: DailyStat[]) {
  return rows.reduce(addRow, emptyTotals());
}

/** One point per day across the full range (zero-filled), for the chart. */
export function byDay(rows: DailyStat[], from: string, to: string, runsByDay: Record<string, number> = {}) {
  const map = new Map<string, Totals>();
  for (const r of rows) map.set(r.day, addRow(map.get(r.day) ?? emptyTotals(), r));
  const out: { day: string; runs: number; impressions: number; clicks: number; engagements: number }[] = [];
  for (let d = new Date(from + "T00:00:00Z"); d <= new Date(to + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const t = map.get(key) ?? emptyTotals();
    out.push({ day: key, runs: runsByDay[key] ?? 0, impressions: t.impressions, clicks: t.clicks, engagements: t.gearUnlocks + t.gearEquips + t.challengeCompletes });
  }
  return out;
}

export function breakdown(rows: DailyStat[], key: "slot_id" | "gear_item_id") {
  const map = new Map<string, Totals>();
  for (const r of rows) {
    const k = r[key];
    if (!k) continue;
    map.set(k, addRow(map.get(k) ?? emptyTotals(), r));
  }
  return [...map.entries()].sort((a, b) => b[1].impressions - a[1].impressions || b[1].gearEquips - a[1].gearEquips);
}

export const ctr = (t: Totals) => (t.impressions ? (t.clicks / t.impressions) * 100 : 0);
export const avgSeconds = (t: Totals) => (t.impressions ? t.viewMs / t.impressions / 1000 : 0);
export const fmt = (n: number) => n.toLocaleString("en-US");

export function easternDate(offsetDays = 0) {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  eastern.setDate(eastern.getDate() + offsetDays);
  const y = eastern.getFullYear();
  const m = String(eastern.getMonth() + 1).padStart(2, "0");
  const d = String(eastern.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toCsv(rows: DailyStat[], names: Record<string, string>) {
  const head = ["day", "campaign", "slot_id", "gear_item_id", "impressions", "avg_seconds_on_screen", "clicks",
    "gear_views", "gear_unlocks", "gear_equips", "runs_with_gear", "challenge_starts", "challenge_completes", "daily_unique_players"];
  const lines = rows.map((r) => [
    r.day, names[r.campaign_id ?? ""] ?? r.campaign_id ?? "", r.slot_id ?? "", r.gear_item_id ?? "",
    r.impressions, r.impressions ? (Number(r.view_ms) / r.impressions / 1000).toFixed(2) : "0",
    r.clicks, r.gear_views, r.gear_unlocks, r.gear_equips, r.runs_with_gear, r.challenge_starts,
    r.challenge_completes, r.unique_installs,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  return [head.join(","), ...lines].join("\n");
}

export function isoAgo(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}
