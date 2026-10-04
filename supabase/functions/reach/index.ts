// Reach for the sponsor console: how many runs a campaign's art was seen in, by how
// many players, and how often players tapped the sponsor in the game. Counted once per
// run / once per player, however many placements showed it. The caller's own JWT
// decides which campaigns they may see (RLS), then the service role reads the raw
// events for just those campaigns.
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Midnight (or end of day) in New York for an ISO date, as a UTC timestamp.
function easternEdge(day: string, end: boolean) {
  const probe = new Date(`${day}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" }).formatToParts(probe);
  const off = (parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5").replace("GMT", "");
  const [h, m = "0"] = off.split(":");
  const sign = h.startsWith("-") ? "-" : "+";
  const hh = String(Math.abs(Number(h))).padStart(2, "0"), mm = String(Number(m)).padStart(2, "0");
  return new Date(`${day}T${end ? "23:59:59.999" : "00:00:00"}${sign}${hh}:${mm}`).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const body = await req.json().catch(() => ({}));
  const from = String(body.from ?? ""), to = String(body.to ?? "");
  if (!DAY.test(from) || !DAY.test(to)) return json({ error: "from and to must be YYYY-MM-DD" }, 400);

  const user = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: visible, error: vErr } = await user.from("campaigns").select("id");
  if (vErr) return json({ error: vErr.message }, 401);
  let ids = (visible ?? []).map((c) => c.id as string);
  if (Array.isArray(body.campaign_ids)) ids = ids.filter((id) => body.campaign_ids.includes(id));

  const out = { runsShown: 0, players: 0, taps: 0, runsByDay: {} as Record<string, number>, byCampaign: {} as Record<string, { runsShown: number; players: number; taps: number }> };
  if (ids.length === 0) return json(out);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const runs = new Set<string>(), players = new Set<string>();
  const dayRuns = new Map<string, Set<string>>();
  const camp = new Map<string, { runs: Set<string>; players: Set<string>; taps: number }>();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

  for (let offset = 0; offset < 200_000; offset += 1000) {
    const { data, error } = await admin.from("events")
      .select("type, run_id, install_id, campaign_id, occurred_at")
      .in("type", ["impression", "sponsor_tap"]).neq("platform", "editor").in("campaign_id", ids)
      .gte("occurred_at", easternEdge(from, false)).lte("occurred_at", easternEdge(to, true))
      .order("id").range(offset, offset + 999);
    if (error) return json({ ...out, error: error.message }, 500);
    for (const e of data ?? []) {
      const c = camp.get(e.campaign_id) ?? { runs: new Set<string>(), players: new Set<string>(), taps: 0 };
      camp.set(e.campaign_id, c);
      // In-game taps on the sponsor ("Today's sponsor" card); not part of reach.
      if (e.type === "sponsor_tap") { c.taps++; out.taps++; continue; }
      if (e.install_id) { players.add(e.install_id); c.players.add(e.install_id); }
      if (e.run_id) {
        runs.add(e.run_id); c.runs.add(e.run_id);
        const day = fmt.format(new Date(e.occurred_at));
        const s = dayRuns.get(day) ?? new Set<string>(); s.add(e.run_id); dayRuns.set(day, s);
      }
    }
    if (!data || data.length < 1000) break;
  }

  out.runsShown = runs.size;
  out.players = players.size;
  for (const [d, s] of dayRuns) out.runsByDay[d] = s.size;
  for (const [id, c] of camp) out.byCampaign[id] = { runsShown: c.runs.size, players: c.players.size, taps: c.taps };
  return json(out);
});
