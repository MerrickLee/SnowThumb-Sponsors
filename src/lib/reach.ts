import "server-only";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type Reach = {
  /** Distinct runs where the art was on screen for at least 1 second. */
  runsShown: number;
  /** Distinct players (app installs) who saw it. */
  players: number;
  /** In-game taps on the sponsor (opening the Today's sponsor card). */
  taps: number;
  runsByDay: Record<string, number>;
  byCampaign: Record<string, { runsShown: number; players: number; taps: number }>;
  /** Set when the reach service failed, so admins can see why it's empty. */
  error?: string;
};

/**
 * Reach for an Eastern-time date range, via the `reach` edge function. Each run and each
 * player counts once, however many placements showed the art. The function checks the
 * caller's own session, so sponsors only ever get numbers for their own campaigns.
 */
export async function getReach(campaignIds: string[] | null, from: string, to: string): Promise<Reach> {
  const empty: Reach = { runsShown: 0, players: 0, taps: 0, runsByDay: {}, byCampaign: {} };
  if (campaignIds && campaignIds.length === 0) return empty;
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ...empty, error: "Not signed in" };
  try {
    const res = await fetch(`${env.functionsUrl}/reach`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: env.supabaseKey },
      body: JSON.stringify({ from, to, campaign_ids: campaignIds ?? undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as Partial<Reach> & { error?: string };
    if (!res.ok) return { ...empty, error: json.error ?? `HTTP ${res.status}` };
    return { ...empty, ...json };
  } catch (e) {
    return { ...empty, error: (e as Error).message };
  }
}
