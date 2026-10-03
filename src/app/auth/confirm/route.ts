import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Email links land here: /auth/confirm?token_hash=...&type=magiclink|invite|signup|email|recovery&next=/portal
// Verified on the server, so the link works in any browser or device,
// not only the one that requested it (unlike the PKCE ?code= flow).
const TYPES: EmailOtpType[] = ["magiclink", "invite", "signup", "email", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const fail = (reason: string) => {
    const to = new URL("/login", url.origin);
    to.searchParams.set("error", reason);
    if (next !== "/") to.searchParams.set("next", next);
    return NextResponse.redirect(to);
  };

  if (!tokenHash || !type || !TYPES.includes(type)) return fail("link_invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return fail(/expired|invalid|not found/i.test(error.message) ? "link_expired" : "link_invalid");

  return NextResponse.redirect(new URL(next, url.origin));
}
