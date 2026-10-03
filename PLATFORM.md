# SnowThumb Sponsor Platform: How It Works + Build Guide

## The flow in one picture

```
Sponsor landing page (snowthumb.com/sponsors)
   └─ POST → sponsor-apply ─────────► sponsor_applications  (+ logo in sponsor-intake)
                                            │
                     You accept in the Admin dashboard → create sponsor → magic-link invite
                                            │
Sponsor Portal (Next.js on Vercel)          ▼
   └─ creates campaign, uploads art per slot → creatives (pending) in sponsor-uploads
   └─ clicks "Submit for review"  → campaign.status = submitted
                                            │
Admin dashboard: preview on templates → [Approve]
   └─ POST → review  → validates size/dimensions, copies file to public sponsor-live,
                       stores URL + sha256, campaign.status = approved
                                            │
SnowThumb app (Unity)                       ▼
   └─ GET manifest (launch + resume, 15 min TTL, ETag) → downloads images → swaps textures
   └─ POST track (batched impressions, gear views/unlocks/equips, runs, challenges)
   └─ "Visit sponsor" → GET go → logs click → 302 to sponsor link with UTMs
                                            │
pg_cron hourly → rollup_campaign_stats → campaign_daily_stats → Sponsor + Admin dashboards
```

**"Approved means live" timing:** a player sees the new creative the next time the app opens or comes back from the background after 15 minutes. Nobody touches the App Store.

## What's in this folder

| Path | What it is | Status |
|---|---|---|
| `supabase/migrations/20261003000000_sponsor_platform.sql` | Full schema, security, storage buckets, manifest + tracking + rollup functions, seed slots, house sponsors | Done, tested against Postgres 16 |
| `supabase/functions/manifest` | App downloads this | Done |
| `supabase/functions/track` | App posts events here | Done |
| `supabase/functions/go` | Click redirect with UTMs | Done |
| `supabase/functions/review` | The approve button (admin only) | Done |
| `supabase/functions/sponsor-apply` | Landing page form target | Done |
| `unity/Assets/Scripts/Sponsors/*.cs` | Manifest service, slot component, event queue, gear skin | Done (needs a compile in your project) |
| `HANDOFF_PROMPTS.md` | Prompts for the other AI: dashboard/portal/intake page + Unity shop/challenges | Ready to paste |

## Build order (hard stops)

Don't start a phase until the one before it passes its check.

### Phase 1: Supabase project
1. Create a new Supabase project just for SnowThumb (keep it separate from your other apps). Region: [us-east-1 recommended].
2. Database → Extensions → enable **pg_cron**.
3. Run the migration (SQL editor, or `supabase db push`).
4. Make yourself admin:
   - Authentication → Users → invite `[YOUR_ADMIN_EMAIL]`, accept it.
   - SQL editor: `insert into app_admins (user_id) select id from auth.users where email = '[YOUR_ADMIN_EMAIL]';`
5. Deploy functions. The app and the click link have no login, so those three skip JWT checks:
   ```bash
   supabase functions deploy manifest --no-verify-jwt
   supabase functions deploy track --no-verify-jwt
   supabase functions deploy go --no-verify-jwt
   supabase functions deploy sponsor-apply --no-verify-jwt
   supabase functions deploy review
   supabase secrets set DASHBOARD_ORIGINS="https://[DASHBOARD_DOMAIN],http://localhost:3000" \
     INTAKE_ALLOWED_ORIGINS="https://snowthumb.com,https://www.snowthumb.com" \
     INTAKE_THANKS_URL="https://snowthumb.com/sponsors/thanks" \
     CLICK_FALLBACK_URL="https://snowthumb.com"
   # optional: TURNSTILE_SECRET_KEY, INTAKE_NOTIFY_WEBHOOK_URL (e.g. a GHL inbound webhook)
   ```

**HARD STOP 1:** `curl https://estcsgjculwlrtklidic.supabase.co/functions/v1/manifest` returns JSON with `"schema": 1` and empty `slots`, `gear`, `challenges` arrays.

### Phase 2: House ads end to end (no dashboard yet)
Prove the whole pipe with your own brands before any sponsor touches it.
1. Upload a 2048×512 Croes Ave banner PNG to `sponsor-uploads/<croes-ave sponsor id>/start_gate.png` (Storage UI).
2. SQL editor:
   ```sql
   insert into campaigns (sponsor_id, name, status, priority, link_url)
   select id, 'House: Croes Ave', 'submitted', 0, 'https://croesave.com' from sponsors where slug = 'croes-ave'
   returning id;  -- copy this id
   insert into creatives (campaign_id, sponsor_id, slot_id, upload_path)
   select '[CAMPAIGN_ID]', id, 'park_banner_start_gate', id || '/start_gate.png' from sponsors where slug = 'croes-ave';
   ```
3. Call `review` with `{ "campaign_id": "[CAMPAIGN_ID]", "action": "approve" }` and your admin access token (or wait for the dashboard approve button in Phase 5).

**HARD STOP 2:** the manifest now lists that creative under `park_banner_start_gate` with a public `url` that opens your banner in a browser.

Note on Love Capital: keep its house creatives to logo and name only, no investment language or deal links, and get your securities counsel's OK before it goes live in the app.

### Phase 3: Unity slots
1. Copy `unity/Assets/Scripts/Sponsors/` into your project.
2. Boot scene: empty GameObject `SponsorServices` + `SponsorManifestService`. Set **Functions Base Url** to `https://estcsgjculwlrtklidic.supabase.co/functions/v1`. It must load before the park scene.
3. Every sellable surface: add `SponsorSlot`, set **Slot Id** to the matching row in `slots`, assign the **Renderer**, set **Texture Property** (`_BaseMap` for URP), assign a baked **Fallback Texture** (house ad).
4. Your run controller calls `SponsorEvents.BeginRun()` when the player drops in and `SponsorEvents.EndRun()` on finish or quit.

**HARD STOP 3:** in Play mode the start gate shows the Croes Ave banner from Phase 2. Turn off Wi-Fi and relaunch: it still shows (cache). Delete the app's `sponsor` folder and launch offline: it shows the fallback, never blank.

### Phase 4: Tracking
Fire these from your game code (the slot component handles impressions itself):

| Event | When | Call |
|---|---|---|
| `impression` | Automatic: slot on screen ≥1% for ≥1s cumulative in a run | (SponsorSlot) |
| `run_with_gear` | At run start, once per equipped sponsored board and binding | `Track("run_with_gear", gearItemId: id)` |
| `gear_view` | Gear detail opened in shop | `Track("gear_view", gearItemId: id)` |
| `gear_unlock` | Player unlocks it | `Track("gear_unlock", gearItemId: id)` |
| `gear_equip` | Player equips it | `Track("gear_equip", gearItemId: id)` |
| `challenge_start` | Player opts into / first progresses a challenge | `Track("challenge_start", challengeId: id)` |
| `challenge_complete` | Challenge met | `Track("challenge_complete", challengeId: id)` |
| `click` | Automatic via `/go` | `SponsorEvents.OpenSponsorLink(...)` |

**HARD STOP 4:** build to a real phone (TestFlight), ride a run, wait 30s, then `select type, platform, slot_id, sponsor_id from events order by id desc limit 20;` shows your events with `platform = 'ios'` and `sponsor_id` filled in. Editor events show `platform = 'editor'` and are intentionally left out of sponsor reports.

### Phase 5: Dashboard, portal, intake page
Hand `HANDOFF_PROMPTS.md` → Prompt A to the other AI.

**HARD STOP 5:** a test sponsor applies from snowthumb.com, you accept and invite them, they upload art, you approve, and the art shows on a phone with no app update. Their dashboard shows only their numbers.

### Phase 6: Gear shop + challenges in Unity
Hand `HANDOFF_PROMPTS.md` → Prompt B to Antigravity.

**HARD STOP 6:** a sponsor board is earnable through its challenge, equips with the sponsor art, and `gear_unlock` / `gear_equip` / `run_with_gear` / `challenge_complete` all land in `events`.

## Slot catalog and sponsor specs

Seeded in the migration. **[CONFIRM]** every size against your real meshes/UVs before you sell anything.

| slot id | Kind | Size (px) | Max file |
|---|---|---|---|
| park_banner_start_gate | Banner | 2048×512 | 1 MB |
| park_banner_left_wall | Banner | 2048×512 | 1 MB |
| park_banner_right_wall | Banner | 2048×512 | 1 MB |
| park_banner_finish | Banner | 2048×512 | 1 MB |
| rail_wrap_main | Feature wrap | 1024×128 | 512 KB |
| box_top_rainbow | Feature wrap | 1024×256 | 512 KB |
| kicker_face_main | Feature wrap | 1024×512 | 512 KB |
| event_title | Event title | 1024×256 | 512 KB |
| board_twin_v1 | Board graphic (top + base atlas) | 1024×2048 | 2 MB |
| board_directional_v1 | Board graphic | 1024×2048 | 2 MB |
| binding_classic_v1 | Binding graphic | 1024×1024 | 1 MB |

Rules the review function enforces: PNG or JPEG only, exact pixel size, under max file size. Rules you enforce by eye: no text smaller than [24px] at full size, nothing in the [64px] safe-zone margin, no alcohol/tobacco/gambling/adult content, no "invest" or securities language.

Board and binding templates: export a UV template PNG from each shipped mesh with the safe zone marked, upload it, and put its URL in `slots.template_url`.

## How the pieces behave

**Rotation.** Highest priority tier wins a slot (paid = 10, house = 0), weighted random inside a tier, re-picked each run. Paid always beats house. Two paid sponsors in the same slot split it by `weight`.

**Gear after a campaign ends.** `keep_after_end = true` (default) means players who unlocked a sponsor board keep it and keep seeing the art; it just leaves the shop. Pitch that as a bonus to sponsors. Set it false for gear that should vanish.

**Challenge rule format.** Columns, not code: `scope` (run or total), `feature` (any/box/tube/rail/jump), `trick` (any or your trick id, e.g. `board_slide`), `target_count`, `min_points`. The game evaluates these locally against its trick events. Example: Acme Rail Jam = run / rail / board_slide / 5 → "land 5 board slides on rails in one run".

**Click tracking.** The link never opens mid-run. Only the gear detail screen or a post-run "presented by" card gets a Visit button.

## Tradeoffs and limits (honest list)

- **New shapes still need an app update.** Only art, links, prices, unlock rules and challenges are remote. A new board shape, binding model or slot location ships in a build.
- **Impressions are approximate.** A slot counts as seen when its bounds are on screen and the renderer is visible; it doesn't check if a rail is blocking the banner. Good enough for flat-rate sales; disclose it if you move to CPM.
- **Points and unlocks are on-device.** Fine while gear is cosmetic. If a challenge ever wins a real prize, scores must move server side and sweepstakes rules apply.
- **IAP gear needs store setup.** `unlock = 'iap'` products must exist in App Store Connect and Play Console first (no app update, but store review of the product).
- **Open endpoints.** `track` and `sponsor-apply` are public. There's dedupe, batch caps, a honeypot and optional Turnstile, but no hard rate limit yet. Watch `events` volume after launch.
- **Runtime textures cost memory.** A 2048×512 RGBA texture with mips is about 5.5 MB in memory. Eleven slots plus a couple of boards is roughly 40 to 60 MB worst case. Drop banner sizes to 1024×256 if low-end Android struggles.
- **MaterialPropertyBlock opts those renderers out of the SRP Batcher.** No issue at this slot count.
- **Ad network overlap.** Interstitials from your ad network could show a paying sponsor's competitor. `sponsors.category` is there for when you add blocking.
- **Kids' rating.** If the game gets rated for under-13s, outbound links and tracking rules tighten on both stores. Decide the rating before launch.
- **Unity scripts weren't compiled here.** They use standard APIs (Unity 2021.2+ / Unity 6), but expect a small fix or two on first compile.
