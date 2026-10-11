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

export const BOARD_MONTH_CENTS = 50_000;   // $500 / 30 days
export const BINDING_MONTH_CENTS = 20_000; // $200 / 30 days
export const BOOT_MONTH_CENTS = 20_000;    // $200 / 30 days

export type Product = "placements" | "gear";
export const GEAR_SLOT_KINDS = ["board", "binding", "boot"] as const;
export const isGearKind = (k: string) => (GEAR_SLOT_KINDS as readonly string[]).includes(k);

/**
 * Computes monthly cost for the approved gear kinds in a campaign.
 * Bindings: $200 / 30 days
 * Boots: $200 / 30 days
 * Board: $500 / 30 days
 */
export function gearMonthlyCents(kinds: string[]): number {
  let total = 0;
  const unique = Array.from(new Set(kinds.filter(isGearKind)));
  if (unique.includes("board")) total += BOARD_MONTH_CENTS;
  if (unique.includes("binding")) total += BINDING_MONTH_CENTS;
  if (unique.includes("boot")) total += BOOT_MONTH_CENTS;
  return total > 0 ? total : BINDING_MONTH_CENTS;
}

export function gearBreakdown(kinds: string[]): { label: string; cents: number }[] {
  const items: { label: string; cents: number }[] = [];
  const unique = Array.from(new Set(kinds.filter(isGearKind)));
  if (unique.includes("board")) items.push({ label: "Sponsored board", cents: BOARD_MONTH_CENTS });
  if (unique.includes("binding")) items.push({ label: "Sponsored bindings", cents: BINDING_MONTH_CENTS });
  if (unique.includes("boot")) items.push({ label: "Sponsored boots", cents: BOOT_MONTH_CENTS });
  return items;
}

export const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 });

export const totalCents = (days: number) => DAY_RATE_CENTS * days;

/** Today in New York as YYYY-MM-DD, plus an optional number of days. */
export function easternToday(addDays = 0) {
  const d = new Date(Date.now() + addDays * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
