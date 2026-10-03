"use client";

import type { DailyStat } from "@/lib/types";
import { toCsv } from "@/lib/stats";

export function CsvButton({ rows, names, filename }: { rows: DailyStat[]; names: Record<string, string>; filename: string }) {
  return (
    <button
      className="btn btn-sm"
      disabled={rows.length === 0}
      onClick={() => {
        const blob = new Blob([toCsv(rows, names)], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }}
    >
      Export CSV
    </button>
  );
}
