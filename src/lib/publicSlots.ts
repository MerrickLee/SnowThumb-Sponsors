import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Slot } from "@/lib/types";

/** Sellable slots, read with the public key (RLS allows anon read of active slots). */
export async function getSellableSlots(): Promise<Slot[]> {
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseKey, { auth: { persistSession: false } });
    const { data } = await supabase.from("slots").select("*").eq("active", true).eq("sellable", true).order("sort");
    return (data ?? []) as Slot[];
  } catch {
    return [];
  }
}

export const KIND_PITCH: Record<string, { title: string; why: string }> = {
  banner: { title: "Park banners", why: "Seen every run, from the drop-in to the finish corral." },
  feature_wrap: { title: "Feature wraps", why: "Your logo on the rails, boxes and kickers players aim for." },
  board: { title: "Sponsored board", why: "First person, so players look at your board the entire run." },
  binding: { title: "Sponsored bindings", why: "Visible every run in first person." },
  event_title: { title: "Night session title", why: "“Presented by” the after-dark park event." },
};

export function groupByKind(slots: Slot[]) {
  const order = ["banner", "feature_wrap", "board", "binding", "event_title"];
  const m = new Map<string, Slot[]>();
  for (const s of slots) m.set(s.kind, [...(m.get(s.kind) ?? []), s]);
  return order.filter((k) => m.has(k)).map((k) => ({ kind: k, slots: m.get(k)! }));
}
