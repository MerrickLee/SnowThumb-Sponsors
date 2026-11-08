import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_REQUEST_LIMIT, GEAR_REQUEST_BUCKET, readLimitedJson, validateGearSuggestion } from "@/lib/gear-suggestion-input";
import { reserveRequestSlot } from "@/lib/gear-suggestion-limit";

export const runtime = "nodejs";
export const maxDuration = 20;

const ALLOWED_ORIGINS = new Set(["https://sponsors.snowthumb.com", "https://www.snowthumb.com", "https://snowthumb.com"]);
const duplicate = (error: { statusCode?: string; message: string }) => String(error.statusCode) === "409" || error.message === "The resource already exists";
function headers(request: Request) {
  const origin = request.headers.get("origin");
  return {
    "Cache-Control": "no-store",
    "Vary": "Origin",
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  };
}
export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403, headers: headers(request) });
  return new Response(null, { status: 204, headers: { ...headers(request), "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}

/** Native clients send no Origin. Browsers must use a SnowThumb origin.
 * The private bucket has no public read/write policies; only this server and
 * the explicitly admin-checked inbox can access it. Never return request text.
 */
export async function POST(request: Request) {
  const h = headers(request);
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return Response.json({ ok: false }, { status: 403, headers: h });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ ok: false }, { status: 415, headers: h });
  let input;
  try { input = validateGearSuggestion(await readLimitedJson(request)); }
  catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400, headers: h }); }
  if (!input) return Response.json({ ok: false, error: "invalid_request" }, { status: 400, headers: h });
  try {
    const admin = createAdminClient();
    // Provision one fixed private inbox with the existing server credential.
    // No secret is copied to a browser, the game, or a deployment artifact.
    let { data: config, error: configError } = await admin.storage.getBucket(GEAR_REQUEST_BUCKET);
    if (!config && configError && String(configError.statusCode) === "404") {
      const { error: createError } = await admin.storage.createBucket(GEAR_REQUEST_BUCKET, {
        public: false, fileSizeLimit: 8192, allowedMimeTypes: ["application/json"],
      });
      if (createError && !duplicate(createError)) throw new Error("inbox_unavailable");
      const verified = await admin.storage.getBucket(GEAR_REQUEST_BUCKET);
      config = verified.data; configError = verified.error;
    }
    if (configError || !config || config.public) throw new Error("inbox_unavailable");
    const bucket = admin.storage.from(GEAR_REQUEST_BUCKET);
    // Vercel sets the forwarded client address. Persist only a daily HMAC, never
    // the raw address; rotating the day prevents a cross-day visitor identifier.
    const address = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
      ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const day = new Date().toISOString().slice(0, 10);
    const ip = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(day + ":" + address).digest("hex").slice(0, 32);
    const mode = input.platform.endsWith("Editor") ? "testing" : "inbox";
    const filename = `${input.request_id}.json`;
    const path = `${mode}/${filename}`;
    const { data: saved, error: savedError } = await bucket.list(mode, { search: filename, limit: 1 });
    if (savedError) throw new Error("inbox_unavailable");
    if (saved?.some((file) => file.name === filename)) return Response.json({ ok: true, id: input.request_id }, { headers: h });
    const reserved = await reserveRequestSlot({
      async put(slot, body) {
        const { error } = await bucket.upload(slot, body, { contentType: "application/json", upsert: false });
        if (!error) return "created";
        if (duplicate(error)) return "exists";
        throw new Error("inbox_unavailable");
      },
      async read(slot) {
        const { data, error } = await bucket.download(slot);
        if (error || !data) throw new Error("inbox_unavailable");
        return data.text();
      },
    }, `limits/${mode}/${day}/${ip}`, input.request_id, DAILY_REQUEST_LIMIT);
    if (!reserved) return Response.json({ ok: false, error: "daily_limit" }, { status: 429, headers: { ...h, "Retry-After": "86400" } });
    const payload = { ...input, received_at: new Date().toISOString(), status: "new" };
    const { error } = await bucket.upload(path, JSON.stringify(payload), { contentType: "application/json", upsert: false, cacheControl: "0" });
    if (error) {
      // Concurrent retries can race the preflight list, but cannot overwrite the
      // first request. A duplicate receives the same acknowledgement.
      if (!duplicate(error)) throw new Error("inbox_unavailable");
    }
    return Response.json({ ok: true, id: input.request_id }, { headers: h });
  } catch {
    return Response.json({ ok: false, error: "temporarily_unavailable" }, { status: 503, headers: h });
  }
}
