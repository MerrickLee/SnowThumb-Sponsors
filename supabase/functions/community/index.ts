// /functions/v1/community — today's park, global leaderboard and ghosts for the game.
// Launch scope is safe for every age: players are installs with server-made names
// ("Blue Fox 42"), nothing a player types is stored or shown, and no player can reach another.
//
//   POST /community/submit       a finished daily-park run (+ optional ghost)
//   GET  /community/leaderboard  ?park=<key>&install=<uuid>&limit=20
//   GET  /community/ghost        ?run=<id>
//   GET  /community/me           ?install=<uuid>   (makes the player's name on first call)
import { createClient } from "npm:@supabase/supabase-js@2";

// Self-contained (no ../_shared import) so it deploys as a single file.
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARK = /^[0-9]{4}-[0-9]{2}-[0-9]{2}:[a-z0-9]{4,16}$/;
const MAX_RUNS_PER_DAY = 300;
const MAX_GHOST = 90_000;

// Kid-safe words only, chosen so no adjective + animal pair reads badly. Players can't edit names.
const ADJ = ["Blue", "Swift", "Frosty", "Sunny", "Lucky", "Brave", "Snowy", "Icy", "Rapid", "Chill", "Bright", "Jolly",
  "Mighty", "Silver", "Golden", "Cosmic", "Turbo", "Happy", "Clever", "Zippy", "Breezy", "Fuzzy", "Nimble", "Stormy"];
const ANIMAL = ["Fox", "Otter", "Panda", "Falcon", "Yeti", "Lynx", "Owl", "Wolf", "Moose", "Puffin", "Badger", "Hare",
  "Seal", "Orca", "Koala", "Tiger", "Eagle", "Gecko", "Bison", "Raven", "Marmot", "Penguin", "Husky", "Walrus"];

const easternDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** Finds or makes the player's name. Deterministic per install, with retries on collisions. */
async function player(install: string) {
  const { data: found } = await admin.from("community_players").select("name, banned").eq("install_id", install).maybeSingle();
  if (found) {
    await admin.from("community_players").update({ last_seen: new Date().toISOString() }).eq("install_id", install);
    return found;
  }
  for (let i = 0; i < 12; i++) {
    const h = hash(`${install}:${i}`);
    const name = `${ADJ[h % ADJ.length]} ${ANIMAL[(h >>> 8) % ANIMAL.length]} ${1 + ((h >>> 16) % 99)}`;
    const { data, error } = await admin.from("community_players").insert({ install_id: install, name }).select("name, banned").single();
    if (!error && data) return data;
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    // Another request may have just created this install's row.
    const { data: again } = await admin.from("community_players").select("name, banned").eq("install_id", install).maybeSingle();
    if (again) return again;
  }
  throw new Error("could not name player");
}

/** Scores no real run can reach are kept but hidden. Limits come from the game's scoring (150 to 550 a trick plus crowd bonuses). */
function sanity(r: { score: number; tricks: number; clean_landings: number; duration_ms: number }) {
  const secs = r.duration_ms / 1000;
  if (secs < 8) return "too_fast";
  if (r.tricks > 20 + secs / 1.5) return "too_many_tricks";
  if (r.clean_landings > r.tricks + 2) return "landings_over_tricks";
  if (r.score > r.tricks * 2500 + 500) return "points_per_trick";
  if (r.score > secs * 700 + 1000) return "points_per_second";
  return null;
}

const int = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();

  try {
    if (req.method === "GET" && route === "me") {
      const install = url.searchParams.get("install") ?? "";
      if (!UUID.test(install)) return json({ error: "bad_install" }, 400);
      const p = await player(install);
      return json({ name: p.name, today: easternDay() });
    }

    if (req.method === "GET" && route === "leaderboard") {
      const park = url.searchParams.get("park") ?? "";
      const install = url.searchParams.get("install") ?? "00000000-0000-0000-0000-000000000000";
      if (!PARK.test(park) || !UUID.test(install)) return json({ error: "bad_params" }, 400);
      const limit = int(url.searchParams.get("limit") ?? 20, 1, 100) ?? 20;
      const { data, error } = await admin.rpc("community_leaderboard", { p_park: park, p_install: install, p_limit: limit });
      if (error) throw new Error(error.message);
      return json(data, 200, { "Cache-Control": "no-store" });
    }

    if (req.method === "GET" && route === "ghost") {
      const run = int(url.searchParams.get("run"), 1, Number.MAX_SAFE_INTEGER);
      if (!run) return json({ error: "bad_run" }, 400);
      const { data } = await admin.from("daily_runs").select("ghost, score, park_key, flagged").eq("id", run).maybeSingle();
      if (!data || data.flagged || !data.ghost) return json({ error: "no_ghost" }, 404);
      return json({ ghost: data.ghost, score: data.score, park: data.park_key }, 200, { "Cache-Control": "public, max-age=300" });
    }

    if (req.method === "POST" && route === "submit") {
      if (Number(req.headers.get("content-length") ?? 0) > 150_000) return json({ error: "too_large" }, 413);
      const b = await req.json().catch(() => null) as Record<string, unknown> | null;
      if (!b) return json({ error: "bad_json" }, 400);
      const install = String(b.install_id ?? ""), runId = String(b.run_id ?? ""), park = String(b.park_key ?? "");
      if (!UUID.test(install) || !UUID.test(runId) || !PARK.test(park)) return json({ error: "bad_ids" }, 400);

      // Only today's park, with a grace period for runs started just before midnight Eastern.
      const day = park.slice(0, 10), today = easternDay(), yesterday = easternDay(new Date(Date.now() - 3 * 3600_000));
      if (day !== today && day !== yesterday) return json({ error: "old_park" }, 409);

      const run = {
        score: int(b.score, 0, 2_000_000), tricks: int(b.tricks, 0, 500), clean_landings: int(b.clean_landings, 0, 500),
        duration_ms: int(b.duration_ms, 0, 1_800_000),
      };
      if (Object.values(run).some((v) => v === null)) return json({ error: "bad_numbers" }, 400);
      const r = run as { score: number; tricks: number; clean_landings: number; duration_ms: number };

      const p = await player(install);
      if (p.banned) return json({ error: "unavailable" }, 403);

      const { count } = await admin.from("daily_runs").select("id", { count: "exact", head: true }).eq("install_id", install).eq("day", day);
      if ((count ?? 0) >= MAX_RUNS_PER_DAY) return json({ error: "daily_limit" }, 429);

      const flag = sanity(r);
      const ghost = typeof b.ghost === "string" && b.ghost.length <= MAX_GHOST && /^[A-Za-z0-9+/=]+$/.test(b.ghost) ? b.ghost : null;
      const bestTrick = typeof b.best_trick === "string" ? b.best_trick.replace(/[^\p{L}\p{N} °'\-]/gu, "").slice(0, 40) : null;

      // Previous best on this park, to decide whether this run's ghost is kept.
      const { data: prev } = await admin.from("daily_runs").select("id, score").eq("install_id", install).eq("park_key", park)
        .eq("flagged", false).order("score", { ascending: false }).limit(1).maybeSingle();
      const newBest = !flag && (!prev || r.score > prev.score);

      const { data: saved, error } = await admin.from("daily_runs").insert({
        day, park_key: park, install_id: install, run_id: runId, ...r, best_trick: bestTrick,
        app_version: typeof b.app_version === "string" ? b.app_version.slice(0, 20) : null,
        flagged: !!flag, flag_reason: flag, ghost: newBest ? ghost : null,
      }).select("id").single();
      if (error) {
        if (/duplicate|unique/i.test(error.message)) return json({ error: "duplicate_run" }, 409);
        throw new Error(error.message);
      }
      // Only the best ghost per player per park is kept.
      if (newBest && ghost && prev) await admin.from("daily_runs").update({ ghost: null }).eq("install_id", install).eq("park_key", park).neq("id", saved.id);

      const { data: board } = await admin.rpc("community_leaderboard", { p_park: park, p_install: install, p_limit: 10 });
      return json({ name: p.name, run: saved.id, new_best: newBest, flagged: !!flag, previous_best: prev?.score ?? null, board });
    }

    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.error("community", route, (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
