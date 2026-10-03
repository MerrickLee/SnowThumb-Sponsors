// POST /functions/v1/review
// Admin-only. This is the "approve and it goes live" button.
//
// Body (one of):
//   { "creative_id": "<uuid>", "action": "approve" | "reject" | "retire", "notes": "..." }
//   { "campaign_id": "<uuid>", "action": "approve" | "reject" | "pause" | "archive", "notes": "..." }
//
// Approving a campaign approves + publishes every pending creative in it first.
// If any creative fails validation, nothing in the campaign goes live.
//
// Publishing = validate dimensions/size against the slot, copy the file from the
// private sponsor-uploads bucket to the public sponsor-live bucket under a
// content-hashed path, and store the URL + sha256. The game picks it up on its
// next manifest fetch (launch, or resume after the 15 min TTL).
import { admin, corsFor, imageInfo, json, sha256Hex } from "../_shared/util.ts";

type Action = "approve" | "reject" | "retire" | "pause" | "archive";

async function requireAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: row } = await admin.from("app_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return row ? data.user : null;
}

async function publishCreative(creativeId: string, reviewerId: string, notes: string | null) {
  const { data: cr, error } = await admin
    .from("creatives")
    .select("id, upload_path, slot_id, slots(width, height, max_bytes)")
    .eq("id", creativeId)
    .single();
  if (error || !cr) throw new Error(`creative ${creativeId} not found`);
  // deno-lint-ignore no-explicit-any
  const slot = (cr as any).slots as { width: number; height: number; max_bytes: number };

  const { data: blob, error: dlErr } = await admin.storage.from("sponsor-uploads").download(cr.upload_path);
  if (dlErr || !blob) throw new Error(`could not read upload for ${cr.slot_id}`);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const info = imageInfo(bytes);
  if (!info) throw new Error(`${cr.slot_id}: file must be a PNG or JPEG`);
  if (info.width !== slot.width || info.height !== slot.height) {
    throw new Error(`${cr.slot_id}: must be exactly ${slot.width}x${slot.height}, got ${info.width}x${info.height}`);
  }
  if (bytes.length > slot.max_bytes) {
    throw new Error(`${cr.slot_id}: file is ${Math.round(bytes.length / 1024)}KB, max is ${Math.round(slot.max_bytes / 1024)}KB`);
  }

  const sha = await sha256Hex(bytes);
  const ext = info.mime === "image/png" ? "png" : "jpg";
  const livePath = `c/${cr.id}/${sha.slice(0, 16)}.${ext}`;

  const { error: upErr } = await admin.storage.from("sponsor-live").upload(livePath, bytes, {
    contentType: info.mime,
    cacheControl: "31536000", // safe: the path changes whenever the file changes
    upsert: true,
  });
  if (upErr) throw new Error(`${cr.slot_id}: publish failed (${upErr.message})`);

  const { data: pub } = admin.storage.from("sponsor-live").getPublicUrl(livePath);

  const { error: updErr } = await admin.from("creatives").update({
    status: "approved",
    live_path: livePath,
    public_url: pub.publicUrl,
    sha256: sha,
    width: info.width,
    height: info.height,
    bytes: bytes.length,
    mime: info.mime,
    review_notes: notes,
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  }).eq("id", cr.id);
  if (updErr) throw new Error(`${cr.slot_id}: could not save approval (${updErr.message})`);
}

async function setCreativeStatus(id: string, status: "rejected" | "retired", reviewerId: string, notes: string | null) {
  const { error } = await admin.from("creatives").update({
    status,
    review_notes: notes,
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

Deno.serve(async (req) => {
  const cors = corsFor(req, Deno.env.get("DASHBOARD_ORIGINS"), "http://localhost:3000");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  const user = await requireAdmin(req);
  if (!user) return json({ error: "forbidden" }, 403, cors);

  let body: { creative_id?: string; campaign_id?: string; action?: Action; notes?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, cors);
  }
  const notes = body.notes?.trim() || null;
  const action = body.action;

  try {
    if (body.creative_id) {
      if (action === "approve") await publishCreative(body.creative_id, user.id, notes);
      else if (action === "reject") await setCreativeStatus(body.creative_id, "rejected", user.id, notes);
      else if (action === "retire") await setCreativeStatus(body.creative_id, "retired", user.id, notes);
      else return json({ error: "bad_action" }, 400, cors);
      return json({ ok: true }, 200, cors);
    }

    if (body.campaign_id) {
      const { data: campaign } = await admin.from("campaigns").select("id, status").eq("id", body.campaign_id).maybeSingle();
      if (!campaign) return json({ error: "not_found" }, 404, cors);

      if (action === "approve") {
        const { data: pending } = await admin
          .from("creatives").select("id").eq("campaign_id", campaign.id).eq("status", "pending");
        const { count: approvedCount } = await admin
          .from("creatives").select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id).eq("status", "approved");
        if ((pending?.length ?? 0) + (approvedCount ?? 0) === 0) {
          return json({ error: "Campaign has no creatives to approve." }, 422, cors);
        }

        // Validate everything first so a campaign never goes half-live.
        const failures: string[] = [];
        for (const c of pending ?? []) {
          try {
            await publishCreative(c.id, user.id, notes);
          } catch (e) {
            failures.push((e as Error).message);
          }
        }
        if (failures.length) {
          return json({ error: "Some creatives failed validation; campaign not approved.", failures }, 422, cors);
        }

        const { error } = await admin.from("campaigns").update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          review_notes: notes,
        }).eq("id", campaign.id);
        if (error) throw new Error(error.message);
        return json({ ok: true, published: pending?.length ?? 0 }, 200, cors);
      }

      const map: Record<string, string> = { reject: "rejected", pause: "paused", archive: "archived" };
      if (!action || !map[action]) return json({ error: "bad_action" }, 400, cors);
      const { error } = await admin.from("campaigns").update({ status: map[action], review_notes: notes }).eq("id", campaign.id);
      if (error) throw new Error(error.message);
      return json({ ok: true }, 200, cors);
    }

    return json({ error: "creative_id or campaign_id required" }, 400, cors);
  } catch (e) {
    console.error("review error", e);
    return json({ error: (e as Error).message }, 422, cors);
  }
});
