// GET /functions/v1/manifest
// What the game downloads on launch and on resume. Public, no auth.
// Returns an ETag so the app can send If-None-Match and get a cheap 304.
import { admin, json, sha256Hex } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { data, error } = await admin.rpc("get_app_manifest");
  if (error || !data) {
    console.error("manifest error", error);
    // App keeps using its cached manifest (or house ads) when this fails.
    return json({ error: "manifest_unavailable" }, 503, { "Cache-Control": "no-store" });
  }

  const body = JSON.stringify(data);
  const etag = `"${(await sha256Hex(body)).slice(0, 32)}"`;
  const headers = {
    "Content-Type": "application/json",
    ETag: etag,
    "Cache-Control": "public, max-age=60",
  };

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(req.method === "HEAD" ? null : body, { status: 200, headers });
});
