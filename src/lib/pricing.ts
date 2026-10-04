// What sponsors can buy. The server recomputes every total from this file, so a price
// change here changes the UI, the Stripe charge and the order row together.
//
//   placements  park banners and feature art, by the day
//   gear        the sponsor's board/binding in the in-game shop, by the month or year
export const DAY_RATE_CENTS = 5000; // $50 / day
export const MIN_DAYS = 1;
export const MAX_DAYS = 90;
export const MAX_START_AHEAD_DAYS = 180;
export const DAY_PRESETS = [7, 14, 30] as const;

export type GearTerm = "month" | "year";
export const GEAR_TERMS: Record<GearTerm, { label: string; days: number; cents: number; blurb: string }> = {
  month: { label: "1 month", days: 30, cents: 50_000, blurb: "30 days in the shop" },
  year: { label: "1 year", days: 365, cents: 200_000, blurb: "365 days in the shop, about $167 a month" },
};

export type Product = "placements" | "gear";
export const GEAR_SLOT_KINDS = ["board", "binding"] as const;
export const isGearKind = (k: string) => (GEAR_SLOT_KINDS as readonly string[]).includes(k);

export const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 });

export const totalCents = (days: number) => DAY_RATE_CENTS * days;

/** Today in New York as YYYY-MM-DD, plus an optional number of days. */
export function easternToday(addDays = 0) {
  const d = new Date(Date.now() + addDays * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
