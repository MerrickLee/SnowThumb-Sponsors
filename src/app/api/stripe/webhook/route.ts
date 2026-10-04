// Stripe -> SnowThumb. Point a Stripe webhook endpoint at
// https://sponsors.snowthumb.com/api/stripe/webhook with these events:
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   checkout.session.expired, charge.refunded
// Optional, for analytics only: checkout.session.async_payment_failed, payment_intent.payment_failed
import type Stripe from "stripe";
import { applyPaidSession, getStripe, whoFrom } from "@/lib/stripe";
import { trackServer } from "@/lib/amplitude-server";
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
      case "checkout.session.async_payment_failed": {
        const cs = event.data.object;
        await createAdminClient().from("campaign_orders").update({ status: "canceled" }).eq("stripe_session_id", cs.id).eq("status", "pending");
        await trackServer("payment_failed", whoFrom(cs.metadata), { order_id: cs.metadata?.order_id, campaign_id: cs.metadata?.campaign_id, product: cs.metadata?.product, value: (cs.amount_total ?? 0) / 100 }, event.id);
        break;
      }
      case "checkout.session.expired": {
        // Opened checkout but never paid: the abandonment number.
        const cs = event.data.object;
        await createAdminClient().from("campaign_orders").update({ status: "canceled" })
          .eq("stripe_session_id", cs.id).eq("status", "pending");
        await trackServer("checkout_abandoned", whoFrom(cs.metadata), { order_id: cs.metadata?.order_id, campaign_id: cs.metadata?.campaign_id, product: cs.metadata?.product, value: (cs.amount_total ?? 0) / 100 }, event.id);
        break;
      }
      case "payment_intent.payment_failed": {
        // A declined card or failed 3-D Secure inside checkout. Checkout lets them retry, so this isn't the end of the order.
        const pi = event.data.object;
        await trackServer("payment_declined", whoFrom(pi.metadata), {
          order_id: pi.metadata?.order_id, campaign_id: pi.metadata?.campaign_id, product: pi.metadata?.product,
          decline_code: pi.last_payment_error?.decline_code ?? "", code: pi.last_payment_error?.code ?? "", method: pi.last_payment_error?.payment_method?.type ?? "",
        }, event.id);
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object;
        const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
        // Only a full refund flips the order. Pause the campaign from the admin page if needed.
        if (pi && ch.refunded) {
          await createAdminClient().from("campaign_orders").update({ status: "refunded" }).eq("stripe_payment_intent", pi);
        }
        // Older charges may not carry the payment's metadata; read it from the PaymentIntent then.
        const md = ch.metadata?.order_id ? ch.metadata : pi ? (await getStripe().paymentIntents.retrieve(pi)).metadata : ch.metadata;
        await trackServer(ch.refunded ? "payment_refunded" : "payment_partially_refunded", whoFrom(md), {
          order_id: md?.order_id, campaign_id: md?.campaign_id, product: md?.product,
          value: (ch.amount_refunded ?? 0) / 100, currency: (ch.currency ?? "usd").toUpperCase(),
        }, event.id);
        break;
      }
    }
  } catch (e) {
    console.error("stripe webhook", event.type, (e as Error).message);
    const obj = event.data.object as { metadata?: Record<string, string> };
    await trackServer("payment_webhook_error", whoFrom(obj.metadata), { event_type: event.type, detail: (e as Error).message.slice(0, 300) }, `err_${event.id}`);
    return new Response("Handler failed", { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
