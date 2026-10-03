"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type Point = { day: string; impressions: number; clicks: number; engagements: number };

const SERIES = [
  { key: "impressions", name: "Impressions", color: "#8fd8ff" },
  { key: "engagements", name: "Unlocks + equips + challenges", color: "#5ad19a" },
  { key: "clicks", name: "Clicks", color: "#f2c14e" },
] as const;

export function StatsChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#24324f" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#8b9ab5", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#24324f" }}
            tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
          <YAxis tick={{ fill: "#8b9ab5", fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <Tooltip contentStyle={{ background: "#111a2c", border: "1px solid #24324f", borderRadius: 8, color: "#e9eef7" }}
            labelStyle={{ color: "#8b9ab5" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8b9ab5" }} />
          {SERIES.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
