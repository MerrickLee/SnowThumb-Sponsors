import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// The "Continue" button on /auth/confirm posts here. Verifying only on POST
// means email scanners and click-tracking redirects (which only GET the link)
// can't use up the one-time token before the sponsor does.
const TYPES: EmailOtpType[] = ["magiclink", "invite", "signup", "email", "recovery", "email_change"];

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "") as EmailOtpType;
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const origin = request.nextUrl.origin;

  const fail = (reason: string) => {
    const to = new URL("/login", origin);
    to.searchParams.set("error", reason);
    if (next !== "/") to.searchParams.set("next", next);
    return NextResponse.redirect(to, 303);
  };

  if (!tokenHash || !TYPES.includes(type)) return fail("link_invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return fail(/expired|invalid|not found/i.test(error.message) ? "link_expired" : "link_invalid");

  return NextResponse.redirect(new URL(next, origin), 303);
}
