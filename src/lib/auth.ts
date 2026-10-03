import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Sponsor } from "@/lib/types";

export type SessionContext = {
  userId: string;
  email: string;
  isAdmin: boolean;
  sponsors: Sponsor[];
};

/** Returns who's signed in and what they can see, or null if signed out. */
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const [{ data: adminRow }, { data: sponsors }] = await Promise.all([
    supabase.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("sponsors").select("*").order("name"),
  ]);

  return {
    userId,
    email: (claims.claims.email as string | undefined) ?? "",
    isAdmin: !!adminRow,
    sponsors: (sponsors ?? []) as Sponsor[],
  };
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.isAdmin) redirect("/portal");
  return s;
}

export async function requireSponsor() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.isAdmin) return s; // admins can view the portal too
  if (s.sponsors.length === 0) redirect("/login?error=no_sponsor");
  return s;
}
