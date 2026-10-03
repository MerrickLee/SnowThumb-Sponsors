import type { DailyStat } from "@/lib/types";
import { avgSeconds, breakdown, byDay, ctr, fmt, totals } from "@/lib/stats";
import { StatsChart } from "@/components/StatsChart";
import { CsvButton } from "@/components/CsvButton";

export function Kpis({ rows }: { rows: DailyStat[] }) {
  const t = totals(rows);
  const tiles = [
    { label: "Impressions", value: fmt(t.impressions) },
    { label: "Avg seconds on screen", value: avgSeconds(t).toFixed(1) },
    { label: "Clicks", value: fmt(t.clicks) },
    { label: "CTR", value: `${ctr(t).toFixed(2)}%` },
    { label: "Gear unlocks", value: fmt(t.gearUnlocks) },
    { label: "Gear equips", value: fmt(t.gearEquips) },
    { label: "Runs on your gear", value: fmt(t.runsWithGear) },
    { label: "Challenges completed", value: fmt(t.challengeCompletes) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((k) => (
        <div key={k.label} className="card p-4">
          <p className="text-xs font-bold text-muted">{k.label}</p>
          <p className="text-2xl md:text-3xl font-black mt-1 num">{k.value}</p>
        </div>
      ))}
    </div>
  );
}

export function StatsPanel({
  rows, from, to, names, slotLabels, csvName,
}: {
  rows: DailyStat[]; from: string; to: string;
  names: Record<string, string>; slotLabels: Record<string, string>; csvName: string;
}) {
  const slots = breakdown(rows, "slot_id");
  const gear = breakdown(rows, "gear_item_id");
  if (rows.length === 0) {
    return (
      <div className="card p-8 md:p-10 text-center">
        <p className="title text-xl">No data for these dates yet.</p>
        <p className="text-muted mt-2 max-w-md mx-auto">Numbers appear once an approved campaign is live and players ride with it. Stats refresh every hour, and days are Eastern time.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <Kpis rows={rows} />
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">Daily performance</h2>
          <CsvButton rows={rows} names={names} filename={csvName} />
        </div>
        <StatsChart data={byDay(rows, from, to)} />
        <p className="text-xs text-muted mt-2">Updated hourly. Days are Eastern time.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Breakdown title="By placement" rows={slots} label={(k) => slotLabels[k] ?? k} mode="slot" />
        <Breakdown title="By gear" rows={gear} label={(k) => k} mode="gear" />
      </div>
    </div>
  );
}

function Breakdown({
  title, rows, label, mode,
}: {
  title: string; rows: [string, ReturnType<typeof totals>][]; label: (k: string) => string; mode: "slot" | "gear";
}) {
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-bold px-4 pt-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted p-4">No data yet.</p>
      ) : (
        <table className="table mt-2">
          <thead>
            {mode === "slot" ? (
              <tr><th>Placement</th><th className="text-right">Impr.</th><th className="text-right">Clicks</th><th className="text-right">CTR</th></tr>
            ) : (
              <tr><th>Gear</th><th className="text-right">Views</th><th className="text-right">Unlocks</th><th className="text-right">Equips</th><th className="text-right">Runs</th></tr>
            )}
          </thead>
          <tbody>
            {rows.map(([k, t]) => (
              <tr key={k}>
                <td>{label(k)}</td>
                {mode === "slot" ? (
                  <>
                    <td className="text-right num">{fmt(t.impressions)}</td>
                    <td className="text-right num">{fmt(t.clicks)}</td>
                    <td className="text-right num">{ctr(t).toFixed(2)}%</td>
                  </>
                ) : (
                  <>
                    <td className="text-right num">{fmt(t.gearViews)}</td>
                    <td className="text-right num">{fmt(t.gearUnlocks)}</td>
                    <td className="text-right num">{fmt(t.gearEquips)}</td>
                    <td className="text-right num">{fmt(t.runsWithGear)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
