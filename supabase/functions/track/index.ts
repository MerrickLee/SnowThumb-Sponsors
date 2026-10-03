// POST /functions/v1/track   body: { "events": [ ... up to 200 ... ] }
// Batched analytics from the game. Sponsor/campaign ids are resolved in SQL,
// so the client can't credit the wrong sponsor.
import { admin, json } from "../_shared/util.ts";

const MAX_BODY = 256_000;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY) return json({ error: "too_large" }, 413);

  let payload: { events?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const events = Array.isArray(payload?.events) ? payload.events : null;
  if (!events || events.length === 0) return json({ error: "no_events" }, 400);
  if (events.length > 200) return json({ error: "batch_too_large" }, 413);

  const { data, error } = await admin.rpc("ingest_events", { p_events: events });
  if (error) {
    console.error("ingest error", error);
    return json({ error: "ingest_failed" }, 500);
  }
  return json({ accepted: data ?? 0 });
});
