import type { Metadata } from "next";
import type Stripe from "stripe";
import Link from "next/link";
import { Empty, PageHeader } from "@/components/Shell";
import { ConfirmAction } from "@/components/ConfirmAction";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, paymentsEnabled } from "@/lib/stripe";
import { usd } from "@/lib/pricing";
import { deactivatePromo, reactivatePromo, revokePromoEverywhere, revokePromoOrder } from "@/app/admin/promo-actions";

export const metadata: Metadata = { title: "Promo codes" };
export const dynamic = "force-dynamic";

type Use = {
  id: string; campaign_id: string; product: string; term: string; days: number; status: string;
  promo_code: string; discount_cents: number; paid_cents: number | null; amount_cents: number;
  window_starts_at: string | null; window_ends_at: string | null; paid_at: string | null; revoked_at: string | null;
  sponsors: { name: string } | null; campaigns: { name: string } | null;
};

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "";

function offLabel(c: Stripe.Coupon | undefined) {
  if (!c) return "";
  if (c.percent_off) return `${c.percent_off}% off`;
  if (c.amount_off) return `${usd(c.amount_off)} off`;
  return "";
}

export default async function AdminPromos() {
  if (!paymentsEnabled()) {
    return (<><PageHeader title="Promo codes" /><Empty title="Stripe isn't connected">Add the Stripe keys in Vercel to manage promo codes.</Empty></>);
  }
  const stripe = getStripe();
  const [codes, coupons, { data }] = await Promise.all([
    stripe.promotionCodes.list({ limit: 100 }),
    stripe.coupons.list({ limit: 100 }),
    createAdminClient().from("campaign_orders")
      .select("id, campaign_id, product, term, days, status, promo_code, discount_cents, paid_cents, amount_cents, window_starts_at, window_ends_at, paid_at, revoked_at, sponsors(name), campaigns(name)")
      .not("promo_code", "is", null).in("status", ["paid", "revoked", "refunded"]).order("paid_at", { ascending: false }),
  ]);
  const couponById = new Map(coupons.data.map((c) => [c.id, c]));
  const uses = (data ?? []) as unknown as Use[];
  const usesOf = (code: string) => uses.filter((u) => u.promo_code.toLowerCase() === code.toLowerCase());

  return (
    <>
      <PageHeader title="Promo codes"
        sub={<>Sponsors type these at checkout. Make new ones in Stripe under <strong>Product catalog › Coupons</strong>. If a code leaks, turn it off here, or turn it off and take back every booking it paid for.</>} />
      {codes.data.length === 0 ? (
        <Empty title="No promo codes yet">Create a coupon in Stripe, then add a customer-facing code to it.</Empty>
      ) : (
        <div className="space-y-4">
          {codes.data.map((pc) => {
            const couponId = typeof pc.promotion.coupon === "string" ? pc.promotion.coupon : pc.promotion.coupon?.id;
            const coupon = couponId ? couponById.get(couponId) : undefined;
            const list = usesOf(pc.code);
            const live = list.filter((u) => u.status === "paid");
            return (
              <section key={pc.id} className="card p-4 md:p-5" aria-labelledby={`pc-${pc.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id={`pc-${pc.id}`} className="title text-xl font-mono">{pc.code}</h2>
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${pc.active ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{pc.active ? "Active" : "Off"}</span>
                    </div>
                    <p className="text-sm text-muted mt-1">
                      {[offLabel(coupon), `used ${pc.times_redeemed}${pc.max_redemptions ? ` of ${pc.max_redemptions}` : ""} time${pc.times_redeemed === 1 ? "" : "s"}`,
                        pc.expires_at ? `expires ${day(new Date(pc.expires_at * 1000).toISOString())}` : "no expiry",
                        pc.restrictions.first_time_transaction ? "first booking only" : ""].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pc.active ? (
                      <ConfirmAction action={deactivatePromo} fields={{ promotion_code_id: pc.id }} label="Turn off code" className="btn btn-sm"
                        question="Stop this code working at checkout? Bookings already made keep their days." confirm="Turn off" />
                    ) : (
                      <form action={reactivatePromo}><input type="hidden" name="promotion_code_id" value={pc.id} /><button className="btn btn-sm">Turn back on</button></form>
                    )}
                    {live.length > 0 && (
                      <ConfirmAction action={revokePromoEverywhere} fields={{ promotion_code_id: pc.id, code: pc.code }} label="Revoke everywhere"
                        question={`Turn off ${pc.code} and take back all ${live.length} booking${live.length === 1 ? "" : "s"} it paid for? Those days come off each campaign.`} confirm="Revoke all" />
                    )}
                  </div>
                </div>

                {list.length > 0 && (
                  <div className="mt-4 divide-y divide-line border-t border-line">
                    {list.map((u) => (
                      <div key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{u.sponsors?.name ?? "Sponsor"} · <Link className="link" href={`/portal/campaigns/${u.campaign_id}`}>{u.campaigns?.name ?? "Campaign"}</Link></p>
                          <p className="text-sm text-muted">
                            {u.product === "gear" ? `Gear shop · ${u.term === "year" ? "1 year" : "1 month"}` : `Placements · ${u.days} day${u.days === 1 ? "" : "s"}`}
                            {u.window_starts_at && ` · ${day(u.window_starts_at)} – ${day(u.window_ends_at)}`}
                            {` · ${usd(u.discount_cents)} off, paid ${usd(u.paid_cents ?? 0)}`}
                          </p>
                        </div>
                        {u.status === "paid" ? (
                          <ConfirmAction action={revokePromoOrder} fields={{ order_id: u.id }} label="Revoke"
                            question="Take back this booking? Its days come off the campaign." confirm="Revoke" />
                        ) : (
                          <span className="text-sm text-bad">{u.status === "revoked" ? `Revoked ${day(u.revoked_at)}` : "Refunded"}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
