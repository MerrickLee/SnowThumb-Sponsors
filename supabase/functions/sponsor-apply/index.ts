// POST /functions/v1/sponsor-apply   (multipart/form-data)
// Public intake from the sponsor landing page on snowthumb.com.
//
// Fields: company_name*, contact_name*, contact_email*, website_url,
//         interested_slots (repeatable: banner|feature_wrap|board|binding|event_title),
//         budget_range, message, source_page, logo (file),
//         company_fax (honeypot, must be empty), cf-turnstile-response (if TURNSTILE_SECRET_KEY set)
//
// Works from any site (GHL, Next.js, plain HTML). If the browser posts a plain
// HTML form (no JS), it gets a 303 to INTAKE_THANKS_URL.
import { admin, corsFor, json } from "../_shared/util.ts";

const SLOT_KINDS = ["banner", "feature_wrap", "board", "binding", "event_title"];
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};
const MAX_LOGO = 5 * 1024 * 1024;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function verifyTurnstile(token: string, ip: string | null) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true; // optional
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const data = await r.json().catch(() => ({}));
  return data?.success === true;
}

Deno.serve(async (req) => {
  const cors = corsFor(req, Deno.env.get("INTAKE_ALLOWED_ORIGINS"), "https://snowthumb.com,https://www.snowthumb.com");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  const wantsHtml = (req.headers.get("accept") ?? "").includes("text/html");
  const thanks = Deno.env.get("INTAKE_THANKS_URL") ?? "https://snowthumb.com/sponsors/thanks";
  const done = (status = 200, body: Record<string, unknown> = { ok: true }) =>
    wantsHtml && status === 200
      ? new Response(null, { status: 303, headers: { ...cors, Location: thanks } })
      : json(body, status, cors);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected multipart/form-data." }, 400, cors);
  }
  const get = (k: string) => String(form.get(k) ?? "").trim();

  if (get("company_fax")) return done(); // bot filled the honeypot; pretend success

  if (!(await verifyTurnstile(get("cf-turnstile-response"), req.headers.get("cf-connecting-ip")))) {
    return json({ error: "Verification failed. Please try again." }, 400, cors);
  }

  const company_name = get("company_name").slice(0, 200);
  const contact_name = get("contact_name").slice(0, 200);
  const contact_email = get("contact_email").toLowerCase().slice(0, 254);
  if (!company_name || !contact_name || !EMAIL.test(contact_email)) {
    return json({ error: "Company, your name and a valid email are required." }, 400, cors);
  }

  let website_url = get("website_url").slice(0, 500) || null;
  if (website_url && !/^https?:\/\//i.test(website_url)) website_url = `https://${website_url}`;

  const interested_slots = form.getAll("interested_slots")
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter((s) => SLOT_KINDS.includes(s));

  const { data: app, error } = await admin.from("sponsor_applications").insert({
    company_name,
    contact_name,
    contact_email,
    website_url,
    interested_slots: [...new Set(interested_slots)],
    budget_range: get("budget_range").slice(0, 100) || null,
    message: get("message").slice(0, 4000) || null,
    source_page: get("source_page").slice(0, 300) || req.headers.get("referer"),
  }).select("id").single();
  if (error || !app) {
    console.error("application insert failed", error);
    return json({ error: "Could not save your application. Please email sponsors@snowthumb.com." }, 500, cors);
  }

  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const ext = LOGO_TYPES[logo.type];
    if (ext && logo.size <= MAX_LOGO) {
      const path = `applications/${app.id}/logo.${ext}`;
      const { error: upErr } = await admin.storage.from("sponsor-intake").upload(path, logo, {
        contentType: logo.type,
        upsert: true,
      });
      if (!upErr) await admin.from("sponsor_applications").update({ logo_path: path }).eq("id", app.id);
      else console.error("logo upload failed", upErr);
    }
  }

  // Optional: ping a GHL inbound webhook (or Slack, etc.) so you see new sponsors fast.
  const hook = Deno.env.get("INTAKE_NOTIFY_WEBHOOK_URL");
  if (hook) {
    fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "snowthumb_sponsor_application", id: app.id, company_name, contact_name, contact_email, website_url, interested_slots }),
    }).catch((e) => console.error("notify failed", e));
  }

  return done(200, { ok: true, id: app.id });
});
