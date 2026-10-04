"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type Point = { day: string; runs: number; impressions: number; clicks: number; engagements: number };

const SERIES = [
  { key: "runs", name: "Runs shown in", color: "#082d58" },
  { key: "impressions", name: "Impressions", color: "#0879d9" },
  { key: "engagements", name: "Unlocks + equips + challenges", color: "#0f7a4a" },
  { key: "clicks", name: "Clicks", color: "#c27803" },
] as const;

export function StatsChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 md:h-72 w-full" role="img" aria-label="Daily runs shown in, impressions, engagements and clicks">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#d6e3f1" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#4d6788", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#d6e3f1" }}
            tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
          <YAxis tick={{ fill: "#4d6788", fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #d6e3f1", borderRadius: 8, color: "#082d58" }}
            labelStyle={{ color: "#4d6788" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#4d6788" }} />
          {SERIES.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
