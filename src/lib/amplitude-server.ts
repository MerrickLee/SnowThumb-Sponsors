import "server-only";

// Payment outcomes are recorded from the server (checkout + Stripe webhook) so they
// land in Amplitude even when the sponsor closes the tab or an ad blocker eats the
// browser event. Only sent when the sponsor accepted analytics on the site: the
// choice is copied from the st_consent cookie into the Stripe session metadata.
const AMP_KEY = process.env.AMPLITUDE_API_KEY ?? "0fe2dadd8b57c58c8c715dffca892e62";

type Props = Record<string, string | number | boolean | null | undefined>;

export async function trackServer(
  event: string,
  who: { userId?: string | null; deviceId?: string | null; consent: boolean },
  props: Props = {},
  insertId?: string,
) {
  if (!who.consent || (!who.userId && !who.deviceId)) return;
  try {
    const res = await fetch("https://api2.amplitude.com/2/httpapi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: AMP_KEY,
        events: [{
          event_type: event,
          user_id: who.userId || undefined,
          device_id: who.deviceId || undefined,
          time: Date.now(),
          insert_id: insertId, // dedupes Stripe webhook retries
          event_properties: { ...props, source: "server" },
          platform: "Web",
        }],
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) console.error("amplitude", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("amplitude", (e as Error).message); // never block a payment on analytics
  }
}
