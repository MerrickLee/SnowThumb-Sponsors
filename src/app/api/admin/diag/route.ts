import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Temporary admin-only check of the service key. Reports the key's kind and role,
// never the key itself.
export async function GET() {
  const s = await getSession();
  if (!s?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let kind = "missing", role: string | null = null, ref: string | null = null;
  if (key.startsWith("sb_secret_")) kind = "secret key (new style)";
  else if (key.startsWith("sb_publishable_")) kind = "PUBLISHABLE key (wrong)";
  else if (key.split(".").length === 3) {
    kind = "JWT (legacy)";
    try {
      const p = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      role = p.role ?? null; ref = p.ref ?? null;
    } catch { /* ignore */ }
  } else if (key) kind = "unrecognised";
  let events: number | null = null, error: string | null = null;
  try {
    const { count, error: e } = await createAdminClient().from("events").select("id", { count: "exact", head: true });
    events = count; error = e?.message ?? null;
  } catch (e) { error = (e as Error).message; }
  return NextResponse.json({ kind, role, projectRef: ref, eventsVisible: events, error });
}
