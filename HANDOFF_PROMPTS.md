# Handoff Prompts

Two prompts. **Prompt A** goes to a web coding agent (Claude Code, Cursor, v0, etc.) for the dashboard, sponsor portal and intake page. **Prompt B** goes to Antigravity inside the Unity project. Attach this whole folder to both so they can read the migration and functions.

Fill in every `[BRACKET]` first.

---

## Prompt A: Sponsor portal, admin dashboard, intake page (Next.js + Vercel + Supabase)

```
You're building the web side of the SnowThumb sponsor platform. SnowThumb is a first-person snowboarding mobile game. Sponsors buy banner, feature-wrap, board and binding ad slots inside the game. The backend already exists and is tested; do NOT change the database schema or the edge functions unless you find a real bug, and if you do, tell me before changing it.

READ FIRST (attached folder):
- supabase/migrations/20261003000000_sponsor_platform.sql  (tables, enums, RLS, storage buckets, views)
- supabase/functions/review/index.ts         (approve/reject API; admin only)
- supabase/functions/sponsor-apply/index.ts  (public intake form target)
- README.md                                   (flow, slot specs, build order)

STACK
- Next.js (App Router, TypeScript), deployed to Vercel at [DASHBOARD_DOMAIN, e.g. sponsors.snowthumb.com]
- Supabase project ref estcsgjculwlrtklidic; use @supabase/ssr with the publishable/anon key for all user-facing reads/writes so RLS does the security. Never ship the service role key to the browser. Only use it server-side if absolutely needed, and tell me where.
- Tailwind; clean, dark, snow-park feel matching snowthumb.com: [BRAND COLORS / FONTS or "match the existing site"]
- Charts: Recharts

THREE AREAS

1) Public intake: update the sponsor landing page at snowthumb.com/sponsors
   - The existing site is [SNOWTHUMB.COM STACK + REPO/LOCATION; e.g. "Next.js repo X" or "GHL funnel" or "static HTML"]. Find the existing sponsor page and add the form there; keep the page's current design.
   - Form posts multipart/form-data to https://estcsgjculwlrtklidic.supabase.co/functions/v1/sponsor-apply
     Fields: company_name*, contact_name*, contact_email*, website_url, interested_slots (checkboxes; values banner, feature_wrap, board, binding, event_title), budget_range (select: [BUDGET OPTIONS]), message, logo (file: png/jpg/svg/pdf up to 5MB), source_page, and a hidden honeypot input named company_fax that must stay empty (hide with CSS, not type=hidden).
   - Show inline success/error from the JSON response. Also create /sponsors/thanks for no-JS posts.
   - Add a short "What you get" section: the slot list + specs from README.md, and that approved creative goes live in the app without an app update.
   - Optional: Cloudflare Turnstile widget if I give you a site key: [TURNSTILE_SITE_KEY or "skip"].

2) Sponsor portal (logged-in sponsors) at [DASHBOARD_DOMAIN]
   - Auth: Supabase magic link only. A user only sees sponsors they're in via sponsor_members (RLS already enforces this).
   - Campaigns list + create/edit campaign (name, link_url must be https, starts_at, ends_at, notes). Editing is only allowed in draft/rejected (DB triggers enforce; surface their error messages nicely).
   - For each campaign: pick slots from the `slots` table (show label, description, exact px size, max size, template download if template_url). Upload a file per slot:
       * Validate in the browser BEFORE upload: PNG/JPEG only, exact width x height, under max_bytes. Show a clear error with the required size.
       * Upload to bucket sponsor-uploads at path `<sponsor_id>/<campaign_id>/<slot_id>-<timestamp>.<ext>`, upsert false.
       * Insert/update the creatives row (campaign_id, slot_id, upload_path). Replacing a file = new upload + update upload_path.
       * Preview the art composited on a mockup of the slot (simple CSS frame is fine for banners; use the template image for boards/bindings).
   - "Submit for review" sets campaigns.status = 'submitted'. Show status badges: draft, submitted, approved, rejected (show review_notes), paused, archived.
   - Performance page per campaign and overall, from campaign_daily_stats and campaign_stats_totals:
       * KPI tiles: impressions, avg seconds on screen (view_ms/impressions/1000), clicks, CTR, gear unlocks, gear equips, runs on their gear, challenge completes.
       * Daily line chart (date range picker, default last 30 days), breakdown table by slot and by gear item.
       * CSV export of the daily rows.
       * Note under charts: "Updated hourly. Times are Eastern."
       * Do NOT sum unique_installs across days; label it "daily unique players" if shown.

3) Admin console (users in app_admins; check with a select on app_admins for the current user and redirect others)
   - Applications inbox (sponsor_applications): view, download logo via signed URL (render SVG only inside <img>, never inline), mark contacted/declined, and "Accept" which:
       a) creates a sponsors row (name, slug auto from company name, website, contact),
       b) invites the contact via Supabase Auth admin invite (this needs the service role key: do it in a server action / route handler only),
       c) inserts sponsor_members for the invited user,
       d) sets the application status=accepted and sponsor_id.
   - Review queue: campaigns with status submitted. Show each creative full size (signed URL from sponsor-uploads) on the slot mockup, sponsor link (clickable), dates. Buttons:
       Approve campaign  → POST https://estcsgjculwlrtklidic.supabase.co/functions/v1/review { campaign_id, action: "approve", notes }
       Reject (requires notes) → { campaign_id, action: "reject", notes }
       Per-creative approve/reject → { creative_id, action, notes }
     Send the logged-in admin's access token as `Authorization: Bearer <token>`. On 422, show the `failures` list.
   - Live campaigns: pause/archive (same review endpoint with action pause/archive), edit priority/weight/dates directly (admin RLS allows).
   - Gear & challenges editor: CRUD for gear_items (pick base_model_id from board/binding slots, pick an approved creative, unlock type with its required field, keep_after_end, dates) and challenges (scope, feature, trick, target_count, min_points, reward gear, dates).
   - House campaigns: make it easy to create a campaign for the house sponsors (is_house) with priority 0.
   - Admin analytics: everything above across all sponsors, plus a raw events health panel (events in last hour/day by platform) from the events table.
   - A "Preview manifest" panel that fetches https://estcsgjculwlrtklidic.supabase.co/functions/v1/manifest and shows what the app will receive right now.

RULES
- RLS is the security model. Don't bypass it with the service role for normal reads.
- Every mutating action shows success/failure feedback.
- Mobile-friendly sponsor portal (sponsors will check stats on phones).
- Env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (or publishable key), SUPABASE_SERVICE_ROLE_KEY (server only), NEXT_PUBLIC_FUNCTIONS_URL.
- After deploy, tell me to add the dashboard domain to Supabase Auth redirect URLs and to the DASHBOARD_ORIGINS secret.

BUILD IN THIS ORDER, and stop and report after each step if its check fails:
1. Auth + role routing (admin vs sponsor). Check: admin and a test sponsor land on different homes; the sponsor can't open /admin.
2. Intake form on snowthumb.com. Check: a submission appears in sponsor_applications with the logo in sponsor-intake.
3. Admin accept + invite. Check: invite email arrives; the new user sees only their sponsor.
4. Portal upload + submit with client-side size validation. Check: wrong-size file is blocked before upload; right-size goes in as pending.
5. Admin review + approve. Check: the manifest endpoint lists the creative with a public URL.
6. Dashboards. Check: after inserting test events and running `select rollup_campaign_stats();`, numbers match the raw events for that sponsor, and a second sponsor sees none of them.
7. Gear/challenge editor.

Deliver: the code, a short README with env vars and deploy steps, and a list of anything you couldn't verify.
```

---

## Prompt B: Gear shop, challenges, and wiring in Unity (Antigravity)

```
You're working in the SnowThumb Unity project (first-person snowboarding, indoor park, one-finger steer + half-circle gesture for board slides, scoring boxes < tubes < rails). We're adding sponsor gear and challenges driven by a remote manifest.

ALREADY WRITTEN (do not rewrite; extend only if needed and tell me why):
Assets/Scripts/Sponsors/
  SponsorManifest.cs         data classes matching the manifest JSON
  SponsorManifestService.cs  fetch + cache manifest and textures; PickCreative, FindGear, ShopGear, ActiveChallenges, TextureReady event
  SponsorSlot.cs             put on banners/wraps; swaps textures, logs impressions
  SponsorEvents.cs           BeginRun/EndRun, Track(...), OpenSponsorLink(...), batched upload
  SponsorGearSkin.cs         applies a gear item's texture to a board/binding renderer
Also read README.md (flow, events table, slot ids) in the attached folder.

TASKS
1. Compile check: get the five scripts compiling cleanly in this project. Report any changes.
2. Scene setup:
   - SponsorManifestService in the boot scene with Functions Base Url = https://estcsgjculwlrtklidic.supabase.co/functions/v1
   - SponsorSlot on: start gate banner, left/right wall banners, finish banner, main rail, rainbow box top, main kicker, night-session title card. Slot ids exactly: park_banner_start_gate, park_banner_left_wall, park_banner_right_wall, park_banner_finish, rail_wrap_main, box_top_rainbow, kicker_face_main, event_title. Assign baked Croes Ave / Love Capital fallback textures [ASSET PATHS].
   - Confirm each target material's texture property (_BaseMap for URP) and that UVs show a 2048x512 (banners) image without stretching. List any mesh whose UVs need fixing.
3. Run lifecycle: call SponsorEvents.BeginRun() when the player drops in, EndRun() on finish/bail-to-menu. At BeginRun, Track("run_with_gear", gearItemId) for the equipped board and binding when they're sponsored (sponsor_id not empty).
4. Currency ("[CURRENCY NAME, e.g. Cred]"): award per landed trick using the existing scoring (boxes < tubes < rails). Persist balance, owned gear ids, equipped board/binding ids, and challenge progress locally (PlayerPrefs or a JSON save). Balance can never go negative. Gear ids are strings from the manifest and must survive manifest changes.
5. Gear shop UI (use the project's existing UI system):
   - Boards and Bindings tabs from ShopGear("board"/"binding") plus anything the player owns (FindGear on owned ids, even if in_shop=false).
   - Card: preview with SponsorGearSkin on the right base_model_id prefab, name, sponsor_name ("presented by"), unlock requirement (free / N Cred / reach score N / complete challenge / IAP price).
   - Detail screen: Track("gear_view"); Unlock button; Equip button (Track("gear_equip")); on unlock Track("gear_unlock"); "Visit [sponsor]" button only if has_link → SponsorEvents.OpenSponsorLink(gearItemId: id). Never open links mid-run.
   - If base_model_id isn't a prefab we ship, hide that item (log a warning).
   - unlock = "iap": route through the existing IAP setup with iap_product_id; if IAP isn't set up yet, hide those items and tell me.
6. Challenges:
   - Show ActiveChallenges() on the pre-run screen with sponsor_name, progress, reward gear preview, ends_at countdown if set.
   - Evaluate against the existing trick events: scope "run" resets each run, "total" accumulates; feature any/box/tube/rail/jump; trick any or a specific trick id (map our board-slide gesture to "board_slide" and list every other trick id you use so I can put them in the dashboard); target_count; min_points (run score threshold).
   - First progress → Track("challenge_start", challengeId). Completion → Track("challenge_complete", challengeId), unlock reward_gear_id, celebratory crowd line from our existing preset cheers.
7. Post-run summary: if a sponsor creative is on event_title or the finish banner this run, show a small "presented by" card with a Visit button (OpenSponsorLink with that SponsorSlot.Current.creative_id).

RULES
- No sponsor UI or link interrupts gameplay.
- Offline must work: cached manifest, or baked house art.
- Don't add new network calls; everything goes through the existing scripts.
- Keep runtime texture memory in mind on low-end Android; tell me the total if it's over [60] MB.

BUILD IN THIS ORDER and stop to report if a check fails:
1. Compile. Check: zero errors.
2. Slots in scene. Check: house banner from the live manifest shows in Play mode; airplane mode relaunch still shows it.
3. Run lifecycle + run_with_gear. Check: on a TestFlight build, events table shows run_with_gear with platform ios.
4. Currency + saves. Check: balance and owned gear survive app restart.
5. Shop. Check: unlock/equip works and the sponsor art shows on the board in first person.
6. Challenges. Check: a test challenge (run / rail / board_slide / 5) unlocks its reward board.
7. Post-run card + links. Check: tapping Visit opens the sponsor site with utm_source=snowthumb and a click row appears in events.
```
