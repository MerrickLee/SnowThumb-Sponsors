// Supabase Auth "Send Email" hook -> GoHighLevel inbound webhook.
// Supabase calls this instead of sending its own email. We verify the
// signature, build the sign-in link (server-verified via /auth/confirm so it
// works on any device), and hand subject/heading/body/link to a GHL workflow
// that sends it from send.snowthumb.com.
//
// Secrets (Edge Functions -> Secrets):
//   SEND_EMAIL_HOOK_SECRET  "v1,whsec_..." from Auth -> Hooks (paste it yourself)
//   GHL_AUTH_EMAIL_WEBHOOK  GHL workflow inbound webhook URL (paste it yourself)
//   SITE_URL                https://sponsors.snowthumb.com (optional, default below)
import { Webhook } from "npm:standardwebhooks@1.0.0";

type HookPayload = {
  user: { email: string; user_metadata?: Record<string, unknown> };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

const COPY: Record<string, { subject: string; heading: string; body: string; button: string; type: string }> = {
  magiclink: {
    subject: "Your SnowThumb sign-in link",
    heading: "Sign in to the sponsor console",
    body: "Tap the button to sign in. The link works once, on any device, and expires in one hour.",
    button: "Sign in",
    type: "magiclink",
  },
  signup: {
    subject: "Your SnowThumb sign-in link",
    heading: "Sign in to the sponsor console",
    body: "Tap the button to sign in. The link works once, on any device, and expires in one hour.",
    button: "Sign in",
    type: "signup",
  },
  invite: {
    subject: "You're invited to the SnowThumb sponsor console",
    heading: "Welcome to SnowThumb",
    body: "You've been approved as a SnowThumb sponsor. Open your console to pick placements, upload art and track results. The link works once and expires in 24 hours.",
    button: "Open your console",
    type: "invite",
  },
  recovery: {
    subject: "Your SnowThumb sign-in link",
    heading: "Sign in to the sponsor console",
    body: "Tap the button to sign in. The link works once and expires in one hour.",
    button: "Sign in",
    type: "recovery",
  },
  email_change: {
    subject: "Confirm your new SnowThumb email",
    heading: "Confirm your new email",
    body: "Tap the button to confirm this address for your SnowThumb sponsor account.",
    button: "Confirm email",
    type: "email_change",
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  const ghl = Deno.env.get("GHL_AUTH_EMAIL_WEBHOOK");
  const site = (Deno.env.get("SITE_URL") ?? "https://sponsors.snowthumb.com").replace(/\/$/, "");
  if (!secret || !ghl) {
    console.error("auth-email: missing SEND_EMAIL_HOOK_SECRET or GHL_AUTH_EMAIL_WEBHOOK");
    return json({ error: { http_code: 500, message: "Email service not configured" } }, 500);
  }

  const raw = await req.text();
  let payload: HookPayload;
  try {
    const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));
    payload = wh.verify(raw, Object.fromEntries(req.headers)) as HookPayload;
  } catch (e) {
    console.error("auth-email: bad signature", (e as Error).message);
    return json({ error: { http_code: 401, message: "Invalid signature" } }, 401);
  }

  const { user, email_data: d } = payload;
  const copy = COPY[d.email_action_type] ?? COPY.magiclink;

  // Where to land after sign-in: keep the app's ?next= if Supabase passed one through.
  let next = "/";
  try {
    const r = new URL(d.redirect_to || site);
    const n = r.searchParams.get("next");
    next = n && n.startsWith("/") && !n.startsWith("//") ? n : r.origin === site && r.pathname !== "/auth/callback" ? r.pathname : "/";
  } catch { /* default */ }
  if (d.email_action_type === "invite") next = "/portal";

  const link = `${site}/auth/confirm?token_hash=${encodeURIComponent(d.token_hash)}&type=${copy.type}&next=${encodeURIComponent(next)}`;

  const res = await fetch(ghl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      subject: copy.subject,
      heading: copy.heading,
      body: copy.body,
      button: copy.button,
      link,
      code: d.token, // 6-digit fallback code, if the template wants to show it
      action: d.email_action_type,
      source: "snowthumb_sponsor_auth",
    }),
  });

  if (!res.ok) {
    console.error("auth-email: GHL webhook failed", res.status, await res.text().catch(() => ""));
    return json({ error: { http_code: 502, message: "Couldn't send the email. Try again in a minute." } }, 502);
  }
  return json({});
});
