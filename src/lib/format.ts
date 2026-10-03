import type { Campaign } from "@/lib/types";

/** Offset of America/New_York at a given instant, as "-04:00" / "-05:00". */
function nyOffset(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" })
    .formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const m = parts.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return "-05:00";
  return `${m[1]}${m[2].padStart(2, "0")}:${m[3] ?? "00"}`;
}

/** "2026-11-01" + "start" -> ISO for 00:00:00 Eastern; "end" -> 23:59:59 Eastern. */
export function easternDayToIso(day: string, edge: "start" | "end") {
  const probe = new Date(`${day}T12:00:00Z`);
  const time = edge === "start" ? "00:00:00" : "23:59:59";
  return new Date(`${day}T${time}${nyOffset(probe)}`).toISOString();
}

export function campaignDates(c: Pick<Campaign, "starts_at" | "ends_at">) {
  const f = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : null;
  if (!c.starts_at && !c.ends_at) return "Open-ended";
  return `${f(c.starts_at) ?? "Now"} – ${f(c.ends_at) ?? "Open"}`;
}
