import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
export async function applyPaidSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return null;
  const admin = createAdminClient();
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const { data, error } = await admin.rpc("apply_campaign_payment", { p_session_id: session.id, p_payment_intent: pi });
  if (error) throw new Error(`apply_campaign_payment: ${error.message}`);

  // Remember the Stripe customer so their next checkout is prefilled.
  const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const sponsorId = session.metadata?.sponsor_id;
  if (customer && sponsorId) {
    await admin.from("sponsors").update({ stripe_customer_id: customer }).eq("id", sponsorId).is("stripe_customer_id", null);
  }
  return data;
}
