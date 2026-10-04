// Stripe -> SnowThumb. Point a Stripe webhook endpoint at
// https://sponsors.snowthumb.com/api/stripe/webhook with these events:
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   checkout.session.expired, charge.refunded
import type Stripe from "stripe";
import { applyPaidSession, getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("Not configured", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    console.error("stripe webhook signature", (e as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await applyPaidSession(event.data.object);
        break;
      case "checkout.session.expired":
        await createAdminClient().from("campaign_orders").update({ status: "canceled" })
          .eq("stripe_session_id", event.data.object.id).eq("status", "pending");
        break;
      case "charge.refunded": {
        const ch = event.data.object;
        const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
        // Only a full refund flips the order. Pause the campaign from the admin page if needed.
        if (pi && ch.refunded) {
          await createAdminClient().from("campaign_orders").update({ status: "refunded" }).eq("stripe_payment_intent", pi);
        }
        break;
      }
    }
  } catch (e) {
    console.error("stripe webhook", event.type, (e as Error).message);
    return new Response("Handler failed", { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
