"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { trackServer } from "@/lib/amplitude-server";
import { requireSponsor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import {
  DAY_RATE_CENTS, GEAR_TERMS, MAX_DAYS, MAX_START_AHEAD_DAYS, MIN_DAYS, easternToday, isGearKind, totalCents,
  type GearTerm,
} from "@/lib/pricing";
import type { ActionState } from "@/app/portal/actions";

/**
 * Creates a pending order and sends the sponsor to Stripe Checkout.
 * product=placements: banners/feature art, `days` at the daily rate.
 * product=gear: their board in the shop, `term` = month | year.
 */
export async function startCheckout(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireSponsor();
  const id = String(form.get("id") ?? "");
  const product = form.get("product") === "gear" ? "gear" : "placements";
  // Analytics only if the sponsor said yes to the cookie banner; carried into Stripe metadata for the webhook.
  const consent = (await cookies()).get("st_consent")?.value === "granted";
  const deviceId = String(form.get("amp_device_id") ?? "").slice(0, 100) || null;
  const who = { userId: session.userId, deviceId, consent };
  const base = { campaign_id: id, product };
  // Every way checkout can stop is a coded event, so Amplitude shows where sponsors get stuck.
  const fail = async (code: string, error: string, extra: Record<string, string | number> = {}): Promise<ActionState> => {
    await trackServer("checkout_failed", who, { ...base, code, ...extra });
    return { error, code };
  };
  const today = easternToday();
  const startOn = String(form.get("start_on") ?? "") || today;

  let days: number, unit: number, quantity: number, term: "day" | GearTerm, itemName: string;
  if (product === "gear") {
    const t = String(form.get("term")) as GearTerm;
    if (!(t in GEAR_TERMS)) return fail("bad_term", "Pick a month or a year.");
    term = t; days = GEAR_TERMS[t].days; unit = GEAR_TERMS[t].cents; quantity = 1;
    itemName = `SnowThumb gear shop listing (${GEAR_TERMS[t].label})`;
  } else {
    days = Number(form.get("days"));
    if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS)
      return fail("bad_days", `Pick between ${MIN_DAYS} and ${MAX_DAYS} days.`);
    term = "day"; unit = DAY_RATE_CENTS; quantity = days;
    itemName = "SnowThumb park placements (per day)";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startOn) || startOn < today || startOn > easternToday(MAX_START_AHEAD_DAYS))
    return fail("bad_start", "Pick a start date between today and six months out.");

  // The sponsor's own client: RLS proves they can see this campaign.
  const supabase = await createClient();
  const { data: c } = await supabase.from("campaigns")
    .select("id, name, status, sponsor_id, requires_payment, sponsors(name, is_house, stripe_customer_id)")
    .eq("id", id).maybeSingle();
  if (!c) return fail("not_found", "Campaign not found.");
  const sp = c.sponsors as unknown as { name: string; is_house: boolean; stripe_customer_id: string | null };
  if (c.status !== "approved") return fail("not_approved", "This campaign needs to be approved before you can book.");
  if (sp.is_house || !c.requires_payment) return fail("no_payment_needed", "This campaign doesn't need payment.");

  // Only sell what the campaign has approved art for.
  const { data: art } = await supabase.from("creatives").select("slots(kind)").eq("campaign_id", c.id).eq("status", "approved");
  const kinds = (art ?? []).map((r) => (r.slots as unknown as { kind: string } | null)?.kind ?? "");
  const has = product === "gear" ? kinds.some(isGearKind) : kinds.some((k) => k && !isGearKind(k));
  if (!has) return fail("no_approved_art", product === "gear" ? "This campaign has no approved board or binding art." : "This campaign has no approved banner or feature art.");

  let stripe;
  try { stripe = getStripe(); } catch { return fail("stripe_not_configured", "Payments aren't switched on yet. Email sponsors@snowthumb.com and we'll get you running."); }

  const admin = createAdminClient();
  const amount = product === "gear" ? unit : totalCents(days);
  const { data: order, error: oErr } = await admin.from("campaign_orders").insert({
    campaign_id: c.id, sponsor_id: c.sponsor_id, days, start_on: startOn, product, term,
    unit_amount_cents: unit, amount_cents: amount, created_by: session.userId,
  }).select("id").single();
  if (oErr || !order) return fail("order_insert_failed", "Couldn't start checkout. Try again in a minute.", { detail: oErr?.message ?? "" });

  const back = `${env.siteUrl}/portal/campaigns/${c.id}`;
  let url: string | null = null;
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      // Sponsorships are advertising (a service), which Stripe's Managed Payments
      // (merchant of record) doesn't cover. Stripe defaults new accounts to it, so opt out.
      managed_payments: { enabled: false },
      client_reference_id: order.id,
      // Promo codes (Stripe promotion codes). A 100%-off code finishes with nothing charged.
      allow_promotion_codes: true,
      metadata: {
        order_id: order.id, campaign_id: c.id, sponsor_id: c.sponsor_id, product, term, days: String(days), start_on: startOn,
        user_id: session.userId, amp_device_id: deviceId ?? "", analytics: consent ? "1" : "0",
      },
      payment_intent_data: { metadata: {
        order_id: order.id, campaign_id: c.id, sponsor_id: c.sponsor_id, product,
        user_id: session.userId, amp_device_id: deviceId ?? "", analytics: consent ? "1" : "0",
      } },
      line_items: [{
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: unit,
          product_data: {
            name: itemName,
            description: `${sp.name} · ${c.name} · ${days} day${days === 1 ? "" : "s"}`,
          },
        },
      }],
      ...(sp.stripe_customer_id
        ? { customer: sp.stripe_customer_id }
        : { customer_email: session.email || undefined, customer_creation: "always" as const }),
      success_url: `${back}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}?checkout=canceled`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // an hour to finish
    });
    await admin.from("campaign_orders").update({ stripe_session_id: checkout.id }).eq("id", order.id);
    url = checkout.url;
    await trackServer("checkout_session_created", who, {
      ...base, order_id: order.id, sponsor_id: c.sponsor_id, term, days, value: amount / 100, currency: "USD", start_on: startOn,
    }, `session_created_${checkout.id}`);
  } catch (e) {
    const err = e as { message?: string; code?: string; type?: string };
    console.error("stripe checkout", err.message);
    await admin.from("campaign_orders").update({ status: "canceled" }).eq("id", order.id);
    return fail("stripe_error", "Couldn't reach our payment provider. Try again in a minute.", {
      order_id: order.id, stripe_code: err.code ?? "", stripe_type: err.type ?? "", detail: (err.message ?? "").slice(0, 300),
    });
  }
  if (!url) return fail("no_checkout_url", "Couldn't start checkout. Try again in a minute.", { order_id: order.id });
  redirect(url);
}
