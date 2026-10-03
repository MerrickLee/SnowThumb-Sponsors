-- =====================================================================
-- SnowThumb Sponsor Platform: schema, security, storage, manifest, tracking
-- Target: a dedicated Supabase project (Postgres 15+)
-- Run once. Safe order: enums -> helpers -> tables -> guards -> RLS ->
-- storage -> RPCs -> grants -> seeds -> cron
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type public.slot_kind as enum ('banner', 'feature_wrap', 'board', 'binding', 'event_title');
create type public.campaign_status as enum ('draft', 'submitted', 'approved', 'rejected', 'paused', 'archived');
create type public.creative_status as enum ('pending', 'approved', 'rejected', 'retired');
create type public.unlock_type as enum ('free', 'cred', 'score', 'challenge', 'iap');
create type public.application_status as enum ('new', 'contacted', 'accepted', 'declined');
create type public.event_type as enum (
  'impression', 'gear_view', 'gear_unlock', 'gear_equip', 'run_with_gear',
  'challenge_start', 'challenge_complete', 'click'
);

-- ---------- Generic helpers -----------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return nullif(p, '')::uuid;
exception when others then
  return null;
end $$;

create or replace function public.try_timestamptz(p text)
returns timestamptz language plpgsql stable set search_path = '' as $$
begin
  return nullif(p, '')::timestamptz;
exception when others then
  return null;
end $$;

-- ---------- Admins & sponsors ---------------------------------------
create table public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.sponsors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  website_url   text check (website_url is null or website_url ~ '^https?://'),
  contact_name  text,
  contact_email text,
  category      text,                       -- used later for competitor blocking
  is_house      boolean not null default false,  -- your own brands (Croes Ave, Love Capital)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.sponsor_members (
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (sponsor_id, user_id)
);
create index sponsor_members_user_idx on public.sponsor_members (user_id);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;

create or replace function public.is_sponsor_member(p_sponsor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sponsor_members m
    where m.sponsor_id = p_sponsor and m.user_id = (select auth.uid())
  );
$$;

-- text version for storage paths (folder name = sponsor id), never throws on bad input
create or replace function public.is_sponsor_member_text(p_sponsor text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sponsor_members m
    where m.sponsor_id::text = p_sponsor and m.user_id = (select auth.uid())
  );
$$;

-- ---------- Intake (from the public sponsor page) -------------------
create table public.sponsor_applications (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null,
  contact_name     text not null,
  contact_email    text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website_url      text,
  interested_slots public.slot_kind[] not null default '{}',
  budget_range     text,
  message          text,
  logo_path        text,                    -- sponsor-intake bucket
  source_page      text,
  status           public.application_status not null default 'new',
  sponsor_id       uuid references public.sponsors (id) on delete set null,  -- set when converted
  reviewed_by      uuid references auth.users (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index sponsor_applications_status_idx on public.sponsor_applications (status, created_at desc);

-- ---------- Inventory -------------------------------------------------
-- A slot is a fixed spot shipped in the app. The app only ever renders
-- what it has a slot for, so new slots need an app update; new sponsors don't.
create table public.slots (
  id            text primary key check (id ~ '^[a-z0-9_]{3,64}$'),
  kind          public.slot_kind not null,
  label         text not null,
  description   text,
  width         integer not null check (width between 64 and 4096),
  height        integer not null check (height between 64 and 4096),
  max_bytes     integer not null default 1048576,
  base_model_id text,                       -- board/binding mesh this template wraps
  template_url  text,                       -- downloadable template for sponsors
  sellable      boolean not null default true,
  active        boolean not null default true,
  sort          integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Campaigns & creatives ----------------------------------
create table public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  sponsor_id    uuid not null references public.sponsors (id) on delete cascade,
  name          text not null,
  status        public.campaign_status not null default 'draft',
  link_url      text check (link_url is null or link_url ~ '^https://'),
  utm_campaign  text check (utm_campaign is null or utm_campaign ~ '^[a-z0-9_-]{1,64}$'),
  starts_at     timestamptz,
  ends_at       timestamptz,
  priority      integer not null default 10,   -- house = 0, paid = 10+, highest tier wins a slot
  weight        integer not null default 100 check (weight between 1 and 1000),  -- rotation inside a tier
  notes         text,                          -- from sponsor
  review_notes  text,                          -- from you
  submitted_at  timestamptz,
  approved_at   timestamptz,
  approved_by   uuid references auth.users (id),
  created_by    uuid references auth.users (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index campaigns_sponsor_idx on public.campaigns (sponsor_id);
create index campaigns_live_idx on public.campaigns (status, starts_at, ends_at);

create table public.creatives (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  sponsor_id   uuid not null references public.sponsors (id) on delete cascade,  -- copied from campaign by trigger
  slot_id      text not null references public.slots (id),
  status       public.creative_status not null default 'pending',
  upload_path  text not null,               -- sponsor-uploads/<sponsor_id>/...
  live_path    text,                        -- sponsor-live/c/<creative_id>/<hash>.png
  public_url   text,
  width        integer,
  height       integer,
  bytes        integer,
  mime         text,
  sha256       text,
  review_notes text,
  reviewed_by  uuid references auth.users (id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (campaign_id, slot_id)
);
create index creatives_sponsor_idx on public.creatives (sponsor_id);
create index creatives_review_idx on public.creatives (status, created_at);

-- ---------- Gear & challenges --------------------------------------
create table public.gear_items (
  id              text primary key check (id ~ '^[a-z0-9_]{3,64}$'),  -- stable id stored in player saves
  kind            text not null check (kind in ('board', 'binding')),
  base_model_id   text not null,            -- must match a mesh shipped in the app
  name            text not null,
  tagline         text,
  sponsor_id      uuid references public.sponsors (id) on delete set null,
  campaign_id     uuid references public.campaigns (id) on delete set null,
  creative_id     uuid references public.creatives (id) on delete set null,  -- null = texture baked in app
  unlock          public.unlock_type not null default 'cred',
  cred_price      integer check (cred_price is null or cred_price >= 0),
  score_threshold integer check (score_threshold is null or score_threshold >= 0),
  iap_product_id  text,
  keep_after_end  boolean not null default true,   -- players who unlocked it keep it after the campaign ends
  starts_at       timestamptz,
  ends_at         timestamptz,
  active          boolean not null default true,
  sort            integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (unlock <> 'cred'  or cred_price is not null),
  check (unlock <> 'score' or score_threshold is not null),
  check (unlock <> 'iap'   or iap_product_id is not null)
);
create index gear_items_sponsor_idx on public.gear_items (sponsor_id);

create table public.challenges (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid references public.campaigns (id) on delete cascade,
  sponsor_id     uuid references public.sponsors (id) on delete cascade,
  title          text not null,
  description    text,
  scope          text not null default 'run' check (scope in ('run', 'total')),  -- in one run, or cumulative
  feature        text not null default 'any' check (feature in ('any', 'box', 'tube', 'rail', 'jump')),
  trick          text not null default 'any',                                      -- e.g. board_slide, any
  target_count   integer not null default 1 check (target_count > 0),
  min_points     integer not null default 0 check (min_points >= 0),               -- score-based challenges
  reward_gear_id text references public.gear_items (id) on delete set null,
  starts_at      timestamptz,
  ends_at        timestamptz,
  active         boolean not null default true,
  sort           integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index challenges_sponsor_idx on public.challenges (sponsor_id);

-- ---------- Tracking ------------------------------------------------
create table public.events (
  id              bigint generated always as identity primary key,
  client_event_id uuid not null unique,     -- dedupes client retries
  occurred_at     timestamptz not null,
  received_at     timestamptz not null default now(),
  install_id      uuid not null,
  session_id      uuid,
  run_id          uuid,
  platform        text not null default 'unknown',
  app_version     text,
  type            public.event_type not null,
  sponsor_id      uuid,                     -- resolved server side, never trusted from client
  campaign_id     uuid,
  creative_id     uuid,
  slot_id         text,
  gear_item_id    text,
  challenge_id    uuid,
  duration_ms     integer,
  props           jsonb not null default '{}'
);
create index events_campaign_time_idx on public.events (campaign_id, occurred_at);
create index events_sponsor_time_idx on public.events (sponsor_id, occurred_at);
create index events_time_brin on public.events using brin (occurred_at);

create table public.campaign_daily_stats (
  id                  bigint generated always as identity primary key,
  day                 date not null,        -- America/New_York day
  sponsor_id          uuid not null,
  campaign_id         uuid,
  creative_id         uuid,
  slot_id             text,
  gear_item_id        text,
  impressions         integer not null default 0,
  view_ms             bigint  not null default 0,
  unique_installs     integer not null default 0,  -- unique per row per day; don't sum across days
  gear_views          integer not null default 0,
  gear_unlocks        integer not null default 0,
  gear_equips         integer not null default 0,
  runs_with_gear      integer not null default 0,
  challenge_starts    integer not null default 0,
  challenge_completes integer not null default 0,
  clicks              integer not null default 0,
  refreshed_at        timestamptz not null default now(),
  unique nulls not distinct (day, sponsor_id, campaign_id, creative_id, slot_id, gear_item_id)
);
create index campaign_daily_stats_sponsor_idx on public.campaign_daily_stats (sponsor_id, day);
create index campaign_daily_stats_campaign_idx on public.campaign_daily_stats (campaign_id, day);

-- ---------- updated_at triggers -------------------------------------
create trigger sponsors_updated_at   before update on public.sponsors   for each row execute function public.set_updated_at();
create trigger slots_updated_at      before update on public.slots      for each row execute function public.set_updated_at();
create trigger campaigns_updated_at  before update on public.campaigns  for each row execute function public.set_updated_at();
create trigger creatives_updated_at  before update on public.creatives  for each row execute function public.set_updated_at();
create trigger gear_items_updated_at before update on public.gear_items for each row execute function public.set_updated_at();
create trigger challenges_updated_at before update on public.challenges for each row execute function public.set_updated_at();

-- ---------- Guards: what sponsors can and can't change -------------
-- Not security definer on purpose: current_user is the real caller role.
create or replace function public.guard_campaign_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status       := 'draft';
    new.priority     := 10;
    new.weight       := 100;
    new.review_notes := null;
    new.approved_at  := null;
    new.approved_by  := null;
    new.submitted_at := null;
    return new;
  end if;

  if old.status not in ('draft', 'rejected') then
    raise exception 'This campaign is % and can''t be edited. Contact SnowThumb to make changes.', old.status;
  end if;
  if new.status not in ('draft', 'submitted') then
    raise exception 'Sponsors can only save a draft or submit for review.';
  end if;
  if new.sponsor_id <> old.sponsor_id then
    raise exception 'Campaign sponsor can''t be changed.';
  end if;

  new.priority     := old.priority;
  new.weight       := old.weight;
  new.review_notes := old.review_notes;
  new.approved_at  := old.approved_at;
  new.approved_by  := old.approved_by;
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := now();
  else
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end $$;

create trigger campaigns_guard before insert or update on public.campaigns
  for each row execute function public.guard_campaign_write();

create or replace function public.guard_creative_write()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_campaign_status public.campaign_status;
  v_sponsor uuid;
begin
  select c.status, c.sponsor_id into v_campaign_status, v_sponsor
  from public.campaigns c where c.id = new.campaign_id;

  if v_sponsor is null then
    raise exception 'Campaign not found.';
  end if;
  new.sponsor_id := v_sponsor;  -- always derived, never trusted

  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_admin() then
    return new;
  end if;

  if v_campaign_status not in ('draft', 'rejected') then
    raise exception 'Creatives can only change while the campaign is a draft or was sent back.';
  end if;
  if split_part(new.upload_path, '/', 1) <> v_sponsor::text then
    raise exception 'Upload path must start with your sponsor folder.';
  end if;

  new.status       := 'pending';
  new.live_path    := null;
  new.public_url   := null;
  new.sha256       := null;
  new.review_notes := case when tg_op = 'UPDATE' then old.review_notes else null end;
  new.reviewed_at  := null;
  new.reviewed_by  := null;
  return new;
end $$;

create trigger creatives_guard before insert or update on public.creatives
  for each row execute function public.guard_creative_write();

-- ---------- Row level security --------------------------------------
alter table public.app_admins           enable row level security;
alter table public.sponsors             enable row level security;
alter table public.sponsor_members      enable row level security;
alter table public.sponsor_applications enable row level security;
alter table public.slots                enable row level security;
alter table public.campaigns            enable row level security;
alter table public.creatives            enable row level security;
alter table public.gear_items           enable row level security;
alter table public.challenges           enable row level security;
alter table public.events               enable row level security;
alter table public.campaign_daily_stats enable row level security;

create policy admins_self_read on public.app_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy sponsors_read on public.sponsors for select to authenticated
  using (public.is_admin() or public.is_sponsor_member(id));
create policy sponsors_admin on public.sponsors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy members_read on public.sponsor_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy members_admin on public.sponsor_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy applications_admin on public.sponsor_applications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy slots_read on public.slots for select to anon, authenticated
  using (active);
create policy slots_admin on public.slots for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy campaigns_read on public.campaigns for select to authenticated
  using (public.is_admin() or public.is_sponsor_member(sponsor_id));
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (public.is_admin() or public.is_sponsor_member(sponsor_id));
create policy campaigns_update on public.campaigns for update to authenticated
  using (public.is_admin() or public.is_sponsor_member(sponsor_id))
  with check (public.is_admin() or public.is_sponsor_member(sponsor_id));
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (public.is_admin() or (public.is_sponsor_member(sponsor_id) and status = 'draft'));

create policy creatives_read on public.creatives for select to authenticated
  using (public.is_admin() or public.is_sponsor_member(sponsor_id));
create policy creatives_insert on public.creatives for insert to authenticated
  with check (
    public.is_admin()
    or exists (select 1 from public.campaigns c
               where c.id = campaign_id and public.is_sponsor_member(c.sponsor_id))
  );
create policy creatives_update on public.creatives for update to authenticated
  using (public.is_admin() or public.is_sponsor_member(sponsor_id))
  with check (public.is_admin() or public.is_sponsor_member(sponsor_id));
create policy creatives_delete on public.creatives for delete to authenticated
  using (
    public.is_admin()
    or (public.is_sponsor_member(sponsor_id) and status = 'pending'
        and exists (select 1 from public.campaigns c
                    where c.id = campaign_id and c.status in ('draft', 'rejected')))
  );

create policy gear_read on public.gear_items for select to authenticated
  using (public.is_admin() or (sponsor_id is not null and public.is_sponsor_member(sponsor_id)));
create policy gear_admin on public.gear_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy challenges_read on public.challenges for select to authenticated
  using (public.is_admin() or (sponsor_id is not null and public.is_sponsor_member(sponsor_id)));
create policy challenges_admin on public.challenges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy events_admin_read on public.events for select to authenticated
  using (public.is_admin());

create policy stats_read on public.campaign_daily_stats for select to authenticated
  using (public.is_admin() or public.is_sponsor_member(sponsor_id));

-- Totals per campaign for dashboards (respects the caller's RLS)
create view public.campaign_stats_totals with (security_invoker = true) as
select
  s.sponsor_id,
  s.campaign_id,
  min(s.day)                 as first_day,
  max(s.day)                 as last_day,
  sum(s.impressions)         as impressions,
  sum(s.view_ms)             as view_ms,
  sum(s.gear_views)          as gear_views,
  sum(s.gear_unlocks)        as gear_unlocks,
  sum(s.gear_equips)         as gear_equips,
  sum(s.runs_with_gear)      as runs_with_gear,
  sum(s.challenge_starts)    as challenge_starts,
  sum(s.challenge_completes) as challenge_completes,
  sum(s.clicks)              as clicks,
  case when sum(s.impressions) > 0
       then round(sum(s.clicks)::numeric / sum(s.impressions) * 100, 2) end as ctr_pct
from public.campaign_daily_stats s
group by s.sponsor_id, s.campaign_id;

-- ---------- Storage -------------------------------------------------
-- sponsor-intake : logos from the public application form (private, admin only)
-- sponsor-uploads: creatives sponsors upload in the portal (private, per sponsor folder)
-- sponsor-live   : approved files the app downloads (public, written only by the review function)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('sponsor-intake',  'sponsor-intake',  false, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf']),
  ('sponsor-uploads', 'sponsor-uploads', false, 2097152, array['image/png', 'image/jpeg']),
  ('sponsor-live',    'sponsor-live',    true,  2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "sponsor-intake admin read" on storage.objects for select to authenticated
  using (bucket_id = 'sponsor-intake' and public.is_admin());

create policy "sponsor-uploads read" on storage.objects for select to authenticated
  using (bucket_id = 'sponsor-uploads'
         and (public.is_admin() or public.is_sponsor_member_text((storage.foldername(name))[1])));
create policy "sponsor-uploads insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'sponsor-uploads'
              and public.is_sponsor_member_text((storage.foldername(name))[1]));
create policy "sponsor-uploads delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sponsor-uploads'
         and (public.is_admin() or public.is_sponsor_member_text((storage.foldername(name))[1])));

-- ---------- App manifest (what the game downloads) -----------------
-- Shape is flat arrays so Unity's JsonUtility can parse it.
create or replace function public.get_app_manifest()
returns jsonb language sql stable security definer set search_path = '' as $$
with live_campaigns as (
  select c.id, c.sponsor_id, c.priority, c.weight, c.link_url
  from public.campaigns c
  join public.sponsors s on s.id = c.sponsor_id and s.active
  where c.status = 'approved'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at   is null or c.ends_at   >  now())
),
slot_rows as (
  select sl.id as slot_id, sl.kind, sl.sort,
         jsonb_agg(jsonb_build_object(
           'creative_id',  cr.id,
           'campaign_id',  lc.id,
           'sponsor_id',   s.id,
           'sponsor_name', s.name,
           'is_house',     s.is_house,
           'has_link',     lc.link_url is not null,
           'url',          cr.public_url,
           'sha256',       cr.sha256,
           'width',        cr.width,
           'height',       cr.height,
           'priority',     lc.priority,
           'weight',       lc.weight
         ) order by lc.priority desc, cr.id) as creatives
  from public.creatives cr
  join live_campaigns lc on lc.id = cr.campaign_id
  join public.sponsors s on s.id = lc.sponsor_id
  join public.slots sl on sl.id = cr.slot_id
   and sl.active and sl.kind in ('banner', 'feature_wrap', 'event_title')
  where cr.status = 'approved' and cr.public_url is not null
  group by sl.id, sl.kind, sl.sort
),
gear_rows as (
  select g.id, g.kind, g.base_model_id, g.name, g.tagline, g.sponsor_id, g.creative_id,
         g.unlock, g.cred_price, g.score_threshold, g.iap_product_id, g.keep_after_end, g.sort,
         s.name as sponsor_name, cr.public_url, cr.sha256, c.link_url,
         ((g.starts_at is null or g.starts_at <= now())
          and (g.ends_at is null or g.ends_at > now())
          and (g.campaign_id is null or exists (select 1 from live_campaigns lc where lc.id = g.campaign_id))
         ) as in_shop
  from public.gear_items g
  left join public.sponsors  s  on s.id = g.sponsor_id
  left join public.campaigns c  on c.id = g.campaign_id
  left join public.creatives cr on cr.id = g.creative_id
        and cr.status = 'approved' and cr.public_url is not null
  where g.active
    and (g.creative_id is null or cr.id is not null)
),
challenge_rows as (
  select ch.*, s.name as sponsor_name
  from public.challenges ch
  left join public.sponsors s on s.id = ch.sponsor_id
  where ch.active
    and (ch.starts_at is null or ch.starts_at <= now())
    and (ch.ends_at   is null or ch.ends_at   >  now())
    and (ch.campaign_id is null or exists (select 1 from live_campaigns lc where lc.id = ch.campaign_id))
)
select jsonb_build_object(
  'schema', 1,
  'ttl_seconds', 900,
  'slots', coalesce((
    select jsonb_agg(jsonb_build_object('slot_id', slot_id, 'kind', kind, 'creatives', creatives)
                     order by sort, slot_id)
    from slot_rows), '[]'::jsonb),
  'gear', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',              id,
      'kind',            kind,
      'base_model_id',   base_model_id,
      'name',            name,
      'tagline',         coalesce(tagline, ''),
      'sponsor_id',      sponsor_id,
      'sponsor_name',    coalesce(sponsor_name, ''),
      'creative_id',     creative_id,
      'texture_url',     coalesce(public_url, ''),
      'sha256',          coalesce(sha256, ''),
      'unlock',          unlock,
      'cred_price',      coalesce(cred_price, 0),
      'score_threshold', coalesce(score_threshold, 0),
      'iap_product_id',  coalesce(iap_product_id, ''),
      'has_link',        link_url is not null,
      'in_shop',         in_shop,
      'sort',            sort
    ) order by sort, id)
    from gear_rows where in_shop or keep_after_end), '[]'::jsonb),
  'challenges', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',             id,
      'title',          title,
      'description',    coalesce(description, ''),
      'scope',          scope,
      'feature',        feature,
      'trick',          trick,
      'target_count',   target_count,
      'min_points',     min_points,
      'reward_gear_id', coalesce(reward_gear_id, ''),
      'sponsor_id',     sponsor_id,
      'sponsor_name',   coalesce(sponsor_name, ''),
      'ends_at',        coalesce(to_jsonb(ends_at) #>> '{}', ''),
      'sort',           sort
    ) order by sort, id)
    from challenge_rows), '[]'::jsonb)
);
$$;

-- ---------- Event ingest (called by the track edge function) -------
-- Client sends ids it got from the manifest; sponsor/campaign are resolved
-- here so a tampered client can't credit the wrong sponsor.
create or replace function public.ingest_events(p_events jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'events must be a JSON array';
  end if;
  if jsonb_array_length(p_events) > 200 then
    raise exception 'batch too large (max 200)';
  end if;

  with raw as (
    select x.*
    from jsonb_to_recordset(p_events) as x(
      client_event_id text, type text, occurred_at text, install_id text,
      session_id text, run_id text, platform text, app_version text,
      creative_id text, slot_id text, gear_item_id text, challenge_id text,
      duration_ms integer, props jsonb)
  ),
  clean as (
    select
      public.try_uuid(r.client_event_id)      as client_event_id,
      r.type,
      public.try_timestamptz(r.occurred_at)   as occ,
      public.try_uuid(r.install_id)           as install_id,
      public.try_uuid(r.session_id)           as session_id,
      public.try_uuid(r.run_id)               as run_id,
      case when r.platform in ('ios', 'android', 'editor') then r.platform else 'unknown' end as platform,
      left(r.app_version, 32)                 as app_version,
      public.try_uuid(r.creative_id)          as creative_id,
      nullif(left(r.slot_id, 64), '')         as slot_id,
      nullif(left(r.gear_item_id, 64), '')    as gear_item_id,
      public.try_uuid(r.challenge_id)         as challenge_id,
      least(greatest(coalesce(r.duration_ms, 0), 0), 3600000) as duration_ms,
      coalesce(r.props, '{}'::jsonb)          as props
    from raw r
  ),
  ins as (
    insert into public.events (
      client_event_id, occurred_at, install_id, session_id, run_id, platform, app_version,
      type, sponsor_id, campaign_id, creative_id, slot_id, gear_item_id, challenge_id,
      duration_ms, props)
    select
      c.client_event_id,
      case when c.occ is null
             or c.occ > now() + interval '5 minutes'
             or c.occ < now() - interval '7 days'
           then now() else c.occ end,
      c.install_id, c.session_id, c.run_id, c.platform, c.app_version,
      c.type::public.event_type,
      coalesce(cr.sponsor_id, g.sponsor_id, ch.sponsor_id),
      coalesce(cr.campaign_id, g.campaign_id, ch.campaign_id),
      coalesce(cr.id, g.creative_id),
      coalesce(cr.slot_id, c.slot_id),
      g.id,
      ch.id,
      c.duration_ms,
      c.props
    from clean c
    left join public.creatives  cr on cr.id = c.creative_id
    left join public.gear_items g  on g.id  = c.gear_item_id
    left join public.challenges ch on ch.id = c.challenge_id
    where c.client_event_id is not null
      and c.install_id is not null
      and c.type in (select unnest(enum_range(null::public.event_type))::text)
      and pg_column_size(c.props) <= 2048
    on conflict (client_event_id) do nothing
    returning 1
  )
  select count(*) into v_count from ins;

  return v_count;
end $$;

-- ---------- Daily rollup (hourly via pg_cron) -----------------------
create or replace function public.rollup_campaign_stats(
  p_from date default ((now() at time zone 'America/New_York')::date - 2),
  p_to   date default ((now() at time zone 'America/New_York')::date)
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.campaign_daily_stats where day between p_from and p_to;

  insert into public.campaign_daily_stats (
    day, sponsor_id, campaign_id, creative_id, slot_id, gear_item_id,
    impressions, view_ms, unique_installs, gear_views, gear_unlocks, gear_equips,
    runs_with_gear, challenge_starts, challenge_completes, clicks, refreshed_at)
  select
    (e.occurred_at at time zone 'America/New_York')::date,
    e.sponsor_id, e.campaign_id, e.creative_id, e.slot_id, e.gear_item_id,
    count(*) filter (where e.type = 'impression'),
    coalesce(sum(e.duration_ms) filter (where e.type = 'impression'), 0),
    count(distinct e.install_id),
    count(*) filter (where e.type = 'gear_view'),
    count(*) filter (where e.type = 'gear_unlock'),
    count(*) filter (where e.type = 'gear_equip'),
    count(*) filter (where e.type = 'run_with_gear'),
    count(*) filter (where e.type = 'challenge_start'),
    count(*) filter (where e.type = 'challenge_complete'),
    count(*) filter (where e.type = 'click'),
    now()
  from public.events e
  where e.sponsor_id is not null
    and e.platform <> 'editor'           -- your Unity editor testing never reaches sponsor reports
    and e.occurred_at >= (p_from::timestamp at time zone 'America/New_York')
    and e.occurred_at <  ((p_to + 1)::timestamp at time zone 'America/New_York')
  group by 1, 2, 3, 4, 5, 6;
end $$;

-- ---------- Function grants -----------------------------------------
revoke all on function public.get_app_manifest()                 from public, anon, authenticated;
revoke all on function public.ingest_events(jsonb)               from public, anon, authenticated;
revoke all on function public.rollup_campaign_stats(date, date)  from public, anon, authenticated;
grant execute on function public.get_app_manifest()                to service_role;
grant execute on function public.ingest_events(jsonb)              to service_role;
grant execute on function public.rollup_campaign_stats(date, date) to service_role;

-- ---------- Seeds ---------------------------------------------------
-- House sponsors fill every slot when nothing paid is live.
insert into public.sponsors (name, slug, website_url, is_house, category) values
  ('Croes Ave',             'croes-ave',    'https://croesave.com',             true, 'marketing'),
  ('Love Capital Partners', 'love-capital', 'https://lovecapitalpartners.com',  true, 'real_estate')
on conflict (slug) do nothing;

-- Slot catalog. IDs must match the slotId set on SponsorSlot components in Unity.
-- [CONFIRM] sizes against your actual meshes/UVs before selling.
insert into public.slots (id, kind, label, description, width, height, max_bytes, base_model_id, sort) values
  ('park_banner_start_gate', 'banner',       'Start gate banner',        'Over the drop-in, seen at the start of every run', 2048, 512,  1048576, null,              10),
  ('park_banner_left_wall',  'banner',       'Left wall banner',         'Long wall banner, left side of the slope',         2048, 512,  1048576, null,              20),
  ('park_banner_right_wall', 'banner',       'Right wall banner',        'Long wall banner, right side of the slope',        2048, 512,  1048576, null,              30),
  ('park_banner_finish',     'banner',       'Finish corral banner',     'Shown at the bottom and on the run summary',       2048, 512,  1048576, null,              40),
  ('rail_wrap_main',         'feature_wrap', 'Main rail wrap',           'Logo wrap on the feature rail',                    1024, 128,  524288,  null,              50),
  ('box_top_rainbow',        'feature_wrap', 'Rainbow box top',          'Top sheet of the rainbow box',                     1024, 256,  524288,  null,              60),
  ('kicker_face_main',       'feature_wrap', 'Main kicker face',         'Face of the main jump',                            1024, 512,  524288,  null,              70),
  ('event_title',            'event_title',  'Night session title',      'Presented-by lockup for the night session event',  1024, 256,  524288,  null,              80),
  ('board_twin_v1',          'board',        'Twin board graphic',       'Top + base art for the twin shape (one atlas)',    1024, 2048, 2097152, 'board_twin_v1',   90),
  ('board_directional_v1',   'board',        'Directional board graphic','Top + base art for the directional shape',         1024, 2048, 2097152, 'board_directional_v1', 100),
  ('binding_classic_v1',     'binding',      'Classic binding graphic',  'Strap + highback art',                             1024, 1024, 1048576, 'binding_classic_v1', 110)
on conflict (id) do nothing;

-- ---------- Scheduler -----------------------------------------------
-- Requires pg_cron (Dashboard -> Database -> Extensions). If this line fails,
-- enable the extension and run just this section again.
create extension if not exists pg_cron;
select cron.schedule(
  'snowthumb-rollup-campaign-stats',
  '7 * * * *',
  $cron$select public.rollup_campaign_stats();$cron$
);
