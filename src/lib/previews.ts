import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Creative } from "@/lib/types";

/** Signed 1-hour URLs for creatives in the private sponsor-uploads bucket (RLS-checked). */
export async function signedPreviews(supabase: SupabaseClient, creatives: Creative[]) {
  if (creatives.length === 0) return {} as Record<string, string>;
  const { data } = await supabase.storage
    .from("sponsor-uploads")
    .createSignedUrls(creatives.map((c) => c.upload_path), 3600);
  const byPath = Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  return Object.fromEntries(creatives.map((c) => [c.id, c.public_url ?? byPath[c.upload_path] ?? ""]).filter(([, u]) => u));
}
