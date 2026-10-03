"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function RangePicker({ from, to, campaigns }: { from: string; to: string; campaigns?: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {campaigns && (
        <div>
          <label className="label">Campaign</label>
          <select className="select" value={params.get("campaign") ?? ""} onChange={(e) => set("campaign", e.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">From</label>
        <input type="date" className="input" value={from} max={to} onChange={(e) => set("from", e.target.value)} />
      </div>
      <div>
        <label className="label">To</label>
        <input type="date" className="input" value={to} min={from} onChange={(e) => set("to", e.target.value)} />
      </div>
    </div>
  );
}
