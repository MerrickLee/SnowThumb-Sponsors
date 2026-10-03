"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function RangePicker({ from, to, campaigns }: { from: string; to: string; campaigns?: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-3">
      {campaigns && (
        <div className="col-span-2 sm:min-w-56">
          <label className="label" htmlFor="range-campaign">Campaign</label>
          <select id="range-campaign" className="select" value={params.get("campaign") ?? ""} onChange={(e) => set("campaign", e.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div className="min-w-0">
        <label className="label" htmlFor="range-from">From</label>
        <input id="range-from" type="date" className="input" value={from} max={to} onChange={(e) => set("from", e.target.value)} />
      </div>
      <div className="min-w-0">
        <label className="label" htmlFor="range-to">To</label>
        <input id="range-to" type="date" className="input" value={to} min={from} onChange={(e) => set("to", e.target.value)} />
      </div>
    </div>
  );
}
