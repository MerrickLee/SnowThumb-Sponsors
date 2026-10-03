# SnowThumb Sponsors

One repo for the whole sponsor platform:

- `src/`: the Next.js web app (this README)
- `supabase/`: database migration + edge functions (deployed to `estcsgjculwlrtklidic`)
- `unity/`: reference copy of the game scripts (the live copies are in the SnowThumb Unity repo)
- `PLATFORM.md`: how the whole system works, slot specs, build phases
- `HANDOFF_PROMPTS.md`: prompts for other AI agents

## Web app

Sponsor intake, sponsor portal, admin review and campaign dashboards for SnowThumb.
Next.js 16 (App Router) on Vercel, backed by the SnowThumb Supabase project `estcsgjculwlrtklidic`.

## What's in it

| Route | Who | What |
|---|---|---|
| `/apply` | Public | Sponsor landing page + application form (posts to `sponsor-apply`) |
| `/login` | Invited sponsors, admins | Magic-link sign in (no open sign-up) |
| `/portal` | Sponsors | Campaigns, per-slot art upload with exact-size checks, submit for review |
| `/portal/stats` | Sponsors | KPIs, daily chart, placement and gear breakdowns, CSV export (only their data, via RLS) |
| `/admin` | Admins | Queue counts, event health, live manifest preview, all-sponsor stats |
| `/admin/applications` | Admins | Review applications, Accept + invite (creates sponsor, emails invite, links user) |
| `/admin/review` | Admins | Preview art on slot mockups; Approve + publish (calls `review` function) or send back |
| `/admin/campaigns` | Admins | Priority, weight, dates; pause / resume / archive |
| `/admin/gear` | Admins | Gear items and challenges |
| `/admin/house` | Admins | Croes Ave / Love Capital house campaigns (priority 0) |
| `/embed/sponsor-form.html` | Public | Drop-in form snippet for snowthumb.com if that site isn't this app |

Security is Row Level Security in Supabase. The browser only ever has the publishable key. The service-role key is used in one server action (accepting an application, to send the auth invite).

## Deploy (Vercel)

1. Push this folder to a GitHub repo, import it in Vercel.
2. Environment variables (Production + Preview), from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_FUNCTIONS_URL` (already filled in)
   - `NEXT_PUBLIC_SITE_URL` = `https://[DASHBOARD_DOMAIN]`, e.g. `https://sponsors.snowthumb.com`
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Project Settings → API Keys → secret key. **Server only.**
3. Add the domain in Vercel.
4. Supabase → Authentication → URL Configuration:
   - Site URL: `https://[DASHBOARD_DOMAIN]`
   - Redirect URLs: `https://[DASHBOARD_DOMAIN]/auth/callback`, `http://localhost:3000/auth/callback`
5. Supabase → Edge Functions → Secrets:
   - `DASHBOARD_ORIGINS=https://[DASHBOARD_DOMAIN],http://localhost:3000` (lets the review buttons call the `review` function)
   - `INTAKE_ALLOWED_ORIGINS=https://snowthumb.com,https://www.snowthumb.com,https://[DASHBOARD_DOMAIN]` (lets `/apply` post)
6. Make yourself admin: invite yourself in Supabase → Authentication → Users, accept, then run
   `insert into app_admins (user_id) select id from auth.users where email = '[YOUR_ADMIN_EMAIL]';`

## Local dev

```bash
cp .env.example .env.local   # fill SUPABASE_SERVICE_ROLE_KEY and set NEXT_PUBLIC_SITE_URL=http://localhost:3000
npm install
npm run dev
```

## Sponsor landing page on snowthumb.com

Two options:
- **Link** your existing sponsor page's call-to-action to `https://[DASHBOARD_DOMAIN]/apply`, or
- **Embed** `public/embed/sponsor-form.html` in the existing page (paste into a custom HTML block). It already posts to the live function, and snowthumb.com is already an allowed origin.

## Verified

- `next build` and `eslint` pass.
- `/apply`, `/login`, `/embed/sponsor-form.html` render; `/admin` and `/portal` redirect signed-out users to `/login`.
- Against the live database (in a rolled-back transaction): sponsor sees only their sponsor, can create a campaign, upsert/replace a creative, submit; isn't an admin. Admin sees all sponsors, can create house campaigns (priority 0), gear and challenges.

## Not verified yet (needs the deployed site)

- Magic-link and invite emails end to end (depends on Supabase Auth URL settings above).
- Browser upload → Approve + publish → manifest. Run it once with a house banner after deploy (README Phase 2 in the platform package).
- Supabase's built-in email sender is rate-limited and meant for testing. Set up custom SMTP (Authentication → Emails) before inviting real sponsors.
