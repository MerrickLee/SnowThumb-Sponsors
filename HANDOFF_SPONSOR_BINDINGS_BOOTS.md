# Handoff Prompt: Sponsor bindings and boots

Goes to the developer (or a coding agent) working on both repos. All brackets have been populated with agreed pricing and specs:
- **Sponsor fee:** $200 each for bindings and boots for up to 30 days (1 month) shown in the app. After 30 days it counts for another $200.
- **In-game player unlock price:** 25,000 Cred each (defined as constants at top of migration; SnowThumb board is 35,000 Cred).
- **Logo size & specs:** Transparent PNG, exactly 512×512, ≤ 256 KB.


```
You're adding sponsor-branded BINDINGS and BOOTS to SnowThumb, a first-person snowboarding mobile game (Unity, iOS + Android) with a Supabase-backed sponsor platform (Next.js portal at sponsors.snowthumb.com, repo MerrickLee/SnowThumb-Sponsors; game repo MerrickLee/SnowThumb). Sponsor BOARDS already work end to end; copy that pattern exactly. The sponsor picks the colors of each part, uploads a logo, and the game puts their logo on the gear. Players buy it with in-game points in the Gear Room and get a Visit link to the sponsor's site.

READ FIRST
Sponsor platform repo:
- supabase/migrations/20261003000000_sponsor_platform.sql   (gear_items, slots, creatives, RLS, storage)
- supabase/migrations/20261004000003_gear_listing.sql        (get_app_manifest(): the JSON the app downloads)
- supabase/migrations/20261011000000_sponsor_board_listing.sql (HOW SPONSOR BOARDS WORK: campaigns.board_name/board_tagline + sync_sponsor_board() trigger that creates/refreshes a gear_items row when board art is approved. Mirror this.)
- supabase/migrations/20261012000000_add_boot_slot_kind.sql (Extend slot_kind enum with 'boot' in separate commit)
- supabase/migrations/20261012000001_sponsor_bindings_boots.sql (HOW SPONSOR BINDINGS & BOOTS WORK: slots, sync triggers, colors jsonb, get_app_manifest colors)
- supabase/functions/go/index.ts      (tracked Visit redirect, already supports ?g=<gear_item_id>)
- src/components/CampaignForm.tsx, src/components/GearCustomizer.tsx, src/app/portal/actions.ts, src/components/SlotUploader.tsx, src/app/admin/gear/page.tsx
Unity repo:
- Assets/Scripts/Sponsors/SponsorManifest.cs (GearEntry, GearColors), SponsorManifestService.cs, SponsorEvents.cs (OpenSponsorLink)
- Assets/SnowThumbBigSnow/Runtime/STBS_SponsorBoards.cs   (HOW SPONSOR BOARDS ENTER THE GEAR ROOM: reads manifest gear, builds runtime entries, price, Visit link. Mirror this.)
- Assets/SnowThumbBigSnow/Runtime/STBS_Bindings.cs  (STBS_BindingCatalog.Binding: strap, accent, frame, tintFrame, strapStyle, brand; STBS_BindingAppearance tints materials; STBS_StrapKit builds strap bindings)
- Assets/SnowThumbBigSnow/Runtime/STBS_Boots.cs     (STBS_BootCatalog.Boot: shell, trim, laces, sole)
- Assets/SnowThumbBigSnow/Runtime/UI/STBS_BoardsPage.cs (Gear Room: BOARDS / BINDINGS / BOOTS tabs, cards, hero card, BUY + VISIT buttons)

WHAT THE SPONSOR DOES (portal)
1. In a campaign, a new section "Your bindings and boots in the Gear Room" (optional, like the board section):
   - Bindings: name (≤32), description (≤90), style (Step-on or Strap), color pickers for Frame, Straps, Accent/hardware. Live preview swatch of the binding (simple SVG side view matching the in-game look: highback + two straps for Strap, low heel loop for Step-on).
   - Boots: name (≤32), description (≤90), color pickers for Shell, Trim, Laces, Sole. Live SVG preview.
   - One logo upload shared by both: transparent PNG, exactly 512×512, ≤ 256 KB. Validated in the browser before upload like the other slots. Shown composited on the preview where it sits in game (binding: highback / ankle strap; boot: outer side of the shaft).
   - Colors are stored as #RRGGBB. Reject anything else server-side too.
   - Pricing: $200 each per 30-day listing ($400 for both). After 30 days it counts for another $200 each.
2. These go through the same review as other art (submit → admin approves). Approving the logo creative is what lists the gear.

DATABASE
- Slot rows: binding logo slot (kind 'binding', id 'binding_logo') and boot logo slot (kind 'boot', id 'boot_logo'); kind check constraints and gear_items.kind check extended to allow 'boot'.
- Campaign columns: binding_name, binding_tagline, binding_style ('step_on'|'strap'), binding_frame, binding_strap, binding_accent, boot_name, boot_tagline, boot_shell, boot_trim, boot_laces, boot_sole. Sponsors may edit them only while the campaign is draft/rejected (enforced by guard_campaign_write).
- Added gear_items.colors jsonb (null for boards) to carry the picked colors and style.
- sync_sponsor_binding / sync_sponsor_boot functions + triggers, same shape as sync_sponsor_board: stable ids 'sb_<16 hex of campaign id>' (binding) and 'sk_<...>' (boot), unlock 'cred', cred_price 25000 Cred each (constants at the top of migration), pro_included true, keep_after_end true. Never overwrite a price an admin changed.
- get_app_manifest(): added 'colors' to each gear entry (empty object when null). Keeps schema 1 and every existing field unchanged so shipped apps don't break.
- Admin Gear page: shows colors as swatches and allows editing price.

UNITY
- SponsorManifest.GearEntry: added GearColors class (style, frame, strap, accent, shell, trim, laces, sole as hex strings). JsonUtility tolerates missing fields; confirmed old manifests still parse.
- STBS_SponsorBindings and STBS_SponsorBoots (mirror STBS_SponsorBoards): turn manifest gear of kind binding/boot into runtime STBS_BindingCatalog.Binding / STBS_BootCatalog.Boot entries (brand = sponsor_name, strapStyle from style, colors parsed with ColorUtility). Make STBS_BindingCatalog.Find/All and STBS_BootCatalog.Find/All include them, and STBS_BindingShop/STBS_BootShop Price/HasLink/OpenLink use cred_price (25,000 Cred) and SponsorEvents.OpenSponsorLink(gearItemId: id).
- Logo on the gear: the logo texture comes from the gear entry's texture_url/sha256 (SponsorManifestService downloads it). Add a decal quad (render-only, no collider):
   * Binding: on the highback (strap style) or heel loop (step-on), facing outward, both feet. For strap style, add it in STBS_StrapKit output; for step-on, parent to the binding root.
   * Boot: outer side of each boot shaft, mirrored for left/right. The baked boot outline in STBS_BootShapeData.cs tells you where the shaft surface is.
   * Use a transparent unlit material (alpha), scale to fit with padding, keep aspect. Must look right in first person and on the Gear Room hero preview.
- Gear Room: sponsor bindings/boots appear in their tabs with a SPONSOR chip and the brand name; hero shows name, description, "By <sponsor>", price/BUY (25,000 Cred), and a VISIT <SPONSOR> link that is shown even before buying (same behavior as sponsor boards). Cards appear when the manifest/logo arrive (subscribe to a Changed event like STBS_SponsorBoards).
- Equip/save/ownership works exactly like the shipped bindings and boots (ids are strings from the manifest and must survive manifest changes; owners keep it after the campaign ends).

GOTCHAS IN THIS PROJECT
- Unity's player build sometimes fails with "has an extra field ... can't be serialized" after adding fields to nested classes/structs in MonoBehaviours (stale editor type DB). Prefer new top-level classes or [System.NonSerialized] fields; if it happens, renaming the type fixes it.
- Meshes in player builds are NOT CPU-readable; don't rely on mesh.vertices at runtime (see STBS_BootShapeData for the workaround).
- No links or shop UI may interrupt a run.

BUILD IN THIS ORDER, stop and report if a check fails:
1. Migration applied. Check: approving a test campaign's binding logo creates a gear_items row with kind 'binding', colors and price 25000 Cred; the manifest JSON shows it with colors.
2. Portal. Check: a sponsor can pick colors, see the preview, upload a wrong-size logo (blocked) and a right-size one, save, submit.
3. Unity data. Check: in Play mode with the live manifest, the sponsor binding and boot appear in their Gear Room tabs with the right colors.
4. Logo decals. Check: logo visible on both bindings and both boots in first person and in the Gear Room preview, not stretched, not floating.
5. Buy/equip/Visit. Check: price deducts, item survives restart, Visit opens the sponsor site with utm_source=snowthumb and a click row appears in events.

Deliver: the code, the migration, a short note on anything you couldn't verify, and screenshots of steps 3 and 4.
```
