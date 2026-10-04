import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackServer } from "@/lib/amplitude-server";

/** Who to attribute a Stripe object's events to, from the metadata checkout wrote. */
export function whoFrom(md: Stripe.Metadata | null | undefined) {
  return { userId: md?.user_id || null, deviceId: md?.amp_device_id || null, consent: md?.analytics === "1" };
}

let client: Stripe | null = null;

/** Stripe client. Throws a clear error if the key isn't set in Vercel yet. */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

/**
 * Marks a Checkout Session's order paid and opens (or extends) the campaign's window.
 * Safe to call more than once: the database function ignores repeats. Used by the
 * webhook and as a fallback when the sponsor lands back on the site first.
 */
export async function applyPaidSession(session: Stripe.Checkout.Session, via: "webhook" | "return_page" = "webhook") {
  const md = session.metadata ?? {};
  const who = whoFrom(md);
  const props = {
    order_id: md.order_id, campaign_id: md.campaign_id, sponsor_id: md.sponsor_id, product: md.product, term: md.term,
    days: Number(md.days) || undefined, value: (session.amount_total ?? 0) / 100, currency: (session.currency ?? "usd").toUpperCase(), via,
  };
  if (session.payment_status !== "paid") {
    // Card accepted but money not in yet (bank debits etc.); the async webhook finishes it.
    await trackServer("payment_pending", who, { ...props, payment_status: session.payment_status }, `pending_${session.id}`);
    return null;
  }
  const admin = createAdminClient();
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const { data, error } = await admin.rpc("apply_campaign_payment", { p_session_id: session.id, p_payment_intent: pi });
  if (error) {
    await trackServer("payment_apply_failed", who, { ...props, detail: error.message.slice(0, 300) });
    throw new Error(`apply_campaign_payment: ${error.message}`);
  }
  // Same insert_id from the webhook and the return page, so Amplitude counts it once.
  const o = data as { window_starts_at?: string; window_ends_at?: string } | null;
  await trackServer("payment_succeeded", who, { ...props, window_starts_at: o?.window_starts_at, window_ends_at: o?.window_ends_at }, `paid_${session.id}`);

  // Remember the Stripe customer so their next checkout is prefilled.
  const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const sponsorId = session.metadata?.sponsor_id;
  if (customer && sponsorId) {
    await admin.from("sponsors").update({ stripe_customer_id: customer }).eq("id", sponsorId).is("stripe_customer_id", null);
  }
  return data;
}
