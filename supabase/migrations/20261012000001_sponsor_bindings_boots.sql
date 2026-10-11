-- Sponsor bindings and boots in the in-game Gear Room.
-- Sponsors can configure custom colors and styles for bindings and boots, and upload a shared
-- 512x512 logo. When approved, gear items are created automatically with stable IDs
-- (sb_<id> for bindings, sk_<id> for boots).
-- In-game price starts at 25,000 Cred each; SnowThumb admins can adjust it on the admin Gear page.
-- Sponsor pricing: $200 each per 30 days (1 month), and another $200 for every additional 30-day extension.

-- 1. Update gear_items check constraint to allow 'boot'
alter table public.gear_items drop constraint if exists gear_items_kind_check;
alter table public.gear_items add constraint gear_items_kind_check check (kind in ('board', 'binding', 'boot'));

-- 2. Register slot rows for binding and boot logos
insert into public.slots (id, kind, label, description, width, height, max_bytes, base_model_id, sellable, active, sort)
values
  ('binding_logo', 'binding', 'Binding logo', 'Transparent 512x512 PNG on the highback and strap', 512, 512, 262144, 'binding_classic_v1', true, true, 110),
  ('boot_logo',    'boot',    'Boot logo',    'Transparent 512x512 PNG on the outer boot shaft',    512, 512, 262144, 'boot_classic_v1',    true, true, 120)
on conflict (id) do update set
  kind          = excluded.kind,
  label         = excluded.label,
  description   = excluded.description,
  width         = excluded.width,
  height        = excluded.height,
  max_bytes     = excluded.max_bytes,
  base_model_id = excluded.base_model_id,
  sellable      = excluded.sellable,
  active        = excluded.active,
  sort          = excluded.sort;

-- Retire legacy full-atlas binding template slot if present
update public.slots set sellable = false, active = false where id = 'binding_classic_v1';

-- 3. Add campaign columns for gear customization (boards, bindings, boots)
alter table public.campaigns
  add column if not exists board_name      text check (board_name is null or char_length(board_name) between 1 and 32),
  add column if not exists board_tagline   text check (board_tagline is null or char_length(board_tagline) <= 90),
  add column if not exists binding_name    text check (binding_name is null or char_length(binding_name) between 1 and 32),
  add column if not exists binding_tagline text check (binding_tagline is null or char_length(binding_tagline) <= 90),
  add column if not exists binding_style   text check (binding_style is null or binding_style in ('step_on', 'strap')),
  add column if not exists binding_frame   text check (binding_frame is null or binding_frame ~* '^#[0-9a-f]{6}$'),
  add column if not exists binding_strap   text check (binding_strap is null or binding_strap ~* '^#[0-9a-f]{6}$'),
  add column if not exists binding_accent  text check (binding_accent is null or binding_accent ~* '^#[0-9a-f]{6}$'),
  add column if not exists boot_name       text check (boot_name is null or char_length(boot_name) between 1 and 32),
  add column if not exists boot_tagline    text check (boot_tagline is null or char_length(boot_tagline) <= 90),
  add column if not exists boot_shell      text check (boot_shell is null or boot_shell ~* '^#[0-9a-f]{6}$'),
  add column if not exists boot_trim       text check (boot_trim is null or boot_trim ~* '^#[0-9a-f]{6}$'),
  add column if not exists boot_laces      text check (boot_laces is null or boot_laces ~* '^#[0-9a-f]{6}$'),
  add column if not exists boot_sole       text check (boot_sole is null or boot_sole ~* '^#[0-9a-f]{6}$');

-- 4. Add colors jsonb to gear_items
alter table public.gear_items
  add column if not exists colors jsonb;

-- 5. Helper functions for stable gear IDs
create or replace function public.sponsor_board_gear_id(p_campaign uuid)
returns text language sql immutable as $$
  select 'sp_' || substr(replace(p_campaign::text, '-', ''), 1, 16)
$$;

create or replace function public.sponsor_binding_gear_id(p_campaign uuid)
returns text language sql immutable as $$
  select 'sb_' || substr(replace(p_campaign::text, '-', ''), 1, 16)
$$;

create or replace function public.sponsor_boot_gear_id(p_campaign uuid)
returns text language sql immutable as $$
  select 'sk_' || substr(replace(p_campaign::text, '-', ''), 1, 16)
$$;

-- 6. sync_sponsor_board
create or replace function public.sync_sponsor_board(p_campaign uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c  public.campaigns;
  s  public.sponsors;
  cr public.creatives;
  gid text := public.sponsor_board_gear_id(p_campaign);
begin
  select * into c from public.campaigns where id = p_campaign;
  if not found then return; end if;
  select * into s from public.sponsors where id = c.sponsor_id;

  select x.* into cr
  from public.creatives x
  join public.slots sl on sl.id = x.slot_id and sl.kind = 'board'
  where x.campaign_id = p_campaign and x.status = 'approved' and x.public_url is not null
  order by x.reviewed_at desc nulls last, x.created_at desc
  limit 1;

  if cr.id is null then
    update public.gear_items set active = false, updated_at = now() where id = gid;
    return;
  end if;

  insert into public.gear_items as g
    (id, kind, base_model_id, name, tagline, sponsor_id, campaign_id, creative_id,
     unlock, cred_price, pro_included, keep_after_end, active, sort)
  values
    (gid, 'board', cr.slot_id,
     coalesce(nullif(c.board_name, ''), left(s.name, 26) || ' Board'),
     nullif(c.board_tagline, ''),
     c.sponsor_id, c.id, cr.id,
     'cred', 35000, true, true, true, 100)
  on conflict (id) do update set
    base_model_id = excluded.base_model_id,
    name          = excluded.name,
    tagline       = excluded.tagline,
    creative_id   = excluded.creative_id,
    active        = true,
    updated_at    = now();
end $$;

revoke all on function public.sync_sponsor_board(uuid) from public, anon, authenticated;

-- 7. sync_sponsor_binding
create or replace function public.sync_sponsor_binding(p_campaign uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c  public.campaigns;
  s  public.sponsors;
  cr public.creatives;
  gid text := public.sponsor_binding_gear_id(p_campaign);
  v_binding_cred_price constant integer := 25000;
  v_colors jsonb;
begin
  select * into c from public.campaigns where id = p_campaign;
  if not found then return; end if;
  select * into s from public.sponsors where id = c.sponsor_id;

  -- Look for approved binding logo creative, or fallback to boot logo creative if shared
  select x.* into cr
  from public.creatives x
  join public.slots sl on sl.id = x.slot_id and (sl.kind = 'binding' or sl.id = 'boot_logo')
  where x.campaign_id = p_campaign and x.status = 'approved' and x.public_url is not null
  order by (case when sl.kind = 'binding' then 0 else 1 end), x.reviewed_at desc nulls last, x.created_at desc
  limit 1;

  if cr.id is null then
    -- No approved art: hide it from the shop, keep it for players who already unlocked it.
    update public.gear_items set active = false, updated_at = now() where id = gid;
    return;
  end if;

  v_colors := jsonb_build_object(
    'style',  coalesce(c.binding_style, 'strap'),
    'frame',  coalesce(c.binding_frame, '#111111'),
    'strap',  coalesce(c.binding_strap, '#111111'),
    'accent', coalesce(c.binding_accent, '#ffffff')
  );

  insert into public.gear_items as g
    (id, kind, base_model_id, name, tagline, sponsor_id, campaign_id, creative_id,
     unlock, cred_price, pro_included, keep_after_end, active, sort, colors)
  values
    (gid, 'binding', 'binding_classic_v1',
     coalesce(nullif(c.binding_name, ''), left(s.name, 24) || ' Bindings'),
     nullif(c.binding_tagline, ''),
     c.sponsor_id, c.id, cr.id,
     'cred', v_binding_cred_price, true, true, true, 110, v_colors)
  on conflict (id) do update set
    base_model_id = excluded.base_model_id,
    name          = excluded.name,
    tagline       = excluded.tagline,
    creative_id   = excluded.creative_id,
    colors        = excluded.colors,
    active        = true,
    updated_at    = now();   -- admin-customized cred_price, sort and unlock stay as set
end $$;

revoke all on function public.sync_sponsor_binding(uuid) from public, anon, authenticated;

-- 8. sync_sponsor_boot
create or replace function public.sync_sponsor_boot(p_campaign uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c  public.campaigns;
  s  public.sponsors;
  cr public.creatives;
  gid text := public.sponsor_boot_gear_id(p_campaign);
  v_boot_cred_price constant integer := 25000;
  v_colors jsonb;
begin
  select * into c from public.campaigns where id = p_campaign;
  if not found then return; end if;
  select * into s from public.sponsors where id = c.sponsor_id;

  -- Look for approved boot logo creative, or fallback to binding logo creative if shared
  select x.* into cr
  from public.creatives x
  join public.slots sl on sl.id = x.slot_id and (sl.kind = 'boot' or sl.id = 'binding_logo')
  where x.campaign_id = p_campaign and x.status = 'approved' and x.public_url is not null
  order by (case when sl.kind = 'boot' then 0 else 1 end), x.reviewed_at desc nulls last, x.created_at desc
  limit 1;

  if cr.id is null then
    update public.gear_items set active = false, updated_at = now() where id = gid;
    return;
  end if;

  v_colors := jsonb_build_object(
    'shell', coalesce(c.boot_shell, '#111111'),
    'trim',  coalesce(c.boot_trim,  '#333333'),
    'laces', coalesce(c.boot_laces, '#ffffff'),
    'sole',  coalesce(c.boot_sole,  '#111111')
  );

  insert into public.gear_items as g
    (id, kind, base_model_id, name, tagline, sponsor_id, campaign_id, creative_id,
     unlock, cred_price, pro_included, keep_after_end, active, sort, colors)
  values
    (gid, 'boot', 'boot_classic_v1',
     coalesce(nullif(c.boot_name, ''), left(s.name, 26) || ' Boots'),
     nullif(c.boot_tagline, ''),
     c.sponsor_id, c.id, cr.id,
     'cred', v_boot_cred_price, true, true, true, 120, v_colors)
  on conflict (id) do update set
    base_model_id = excluded.base_model_id,
    name          = excluded.name,
    tagline       = excluded.tagline,
    creative_id   = excluded.creative_id,
    colors        = excluded.colors,
    active        = true,
    updated_at    = now();
end $$;

revoke all on function public.sync_sponsor_boot(uuid) from public, anon, authenticated;

-- 9. Trigger on creatives
create or replace function public.trg_sync_sponsor_gear_creative()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.slot_kind;
  v_cid  uuid := coalesce(new.campaign_id, old.campaign_id);
begin
  select kind into v_kind from public.slots where id = coalesce(new.slot_id, old.slot_id);
  if v_kind = 'board' then
    perform public.sync_sponsor_board(v_cid);
  elsif v_kind in ('binding', 'boot') then
    perform public.sync_sponsor_binding(v_cid);
    perform public.sync_sponsor_boot(v_cid);
  end if;
  return null;
end $$;

drop trigger if exists creatives_sync_sponsor_board on public.creatives;
drop trigger if exists creatives_sync_sponsor_gear on public.creatives;
create trigger creatives_sync_sponsor_gear
  after insert or update of status, public_url or delete on public.creatives
  for each row execute function public.trg_sync_sponsor_gear_creative();

-- 10. Trigger on campaigns
create or replace function public.trg_sync_sponsor_gear_campaign()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.board_name is distinct from old.board_name or new.board_tagline is distinct from old.board_tagline then
    perform public.sync_sponsor_board(new.id);
  end if;
  if new.binding_name is distinct from old.binding_name
     or new.binding_tagline is distinct from old.binding_tagline
     or new.binding_style is distinct from old.binding_style
     or new.binding_frame is distinct from old.binding_frame
     or new.binding_strap is distinct from old.binding_strap
     or new.binding_accent is distinct from old.binding_accent then
    perform public.sync_sponsor_binding(new.id);
  end if;
  if new.boot_name is distinct from old.boot_name
     or new.boot_tagline is distinct from old.boot_tagline
     or new.boot_shell is distinct from old.boot_shell
     or new.boot_trim is distinct from old.boot_trim
     or new.boot_laces is distinct from old.boot_laces
     or new.boot_sole is distinct from old.boot_sole then
    perform public.sync_sponsor_boot(new.id);
  end if;
  return null;
end $$;

drop trigger if exists campaigns_sync_sponsor_board on public.campaigns;
drop trigger if exists campaigns_sync_sponsor_gear on public.campaigns;
create trigger campaigns_sync_sponsor_gear
  after update of board_name, board_tagline,
                  binding_name, binding_tagline, binding_style, binding_frame, binding_strap, binding_accent,
                  boot_name, boot_tagline, boot_shell, boot_trim, boot_laces, boot_sole on public.campaigns
  for each row execute function public.trg_sync_sponsor_gear_campaign();

-- 11. Update get_app_manifest() to output colors
create or replace function public.get_app_manifest()
returns jsonb language sql stable security definer set search_path = '' as $$
with approved as (
  select c.*, (s.is_house or not c.requires_payment) as free_pass
  from public.campaigns c
  join public.sponsors s on s.id = c.sponsor_id and s.active
  where c.status = 'approved'
),
live_campaigns as (
  select a.id, a.sponsor_id, a.priority, a.weight, a.link_url
  from approved a
  where (a.free_pass or a.paid_at is not null)
    and (a.starts_at is null or a.starts_at <= now())
    and (a.ends_at   is null or a.ends_at   >  now())
),
gear_campaigns as (
  select a.id from approved a
  where (a.free_pass
         and (a.starts_at is null or a.starts_at <= now())
         and (a.ends_at   is null or a.ends_at   >  now()))
     or (a.gear_starts_at <= now() and a.gear_ends_at > now())
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
         g.pro_included, g.colors,
         s.name as sponsor_name, cr.public_url, cr.sha256, c.link_url,
         ((g.starts_at is null or g.starts_at <= now())
          and (g.ends_at is null or g.ends_at > now())
          and (g.campaign_id is null or exists (select 1 from gear_campaigns gc where gc.id = g.campaign_id))
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
      'pro_included',    pro_included,
      'has_link',        link_url is not null,
      'in_shop',         in_shop,
      'sort',            sort,
      'colors',          coalesce(colors, '{}'::jsonb)
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
      'ends_at',        coalesce(to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
      'sort',           sort
    ) order by sort, id)
    from challenge_rows), '[]'::jsonb)
);
$$;

-- 12. Backfill existing approved creatives
do $$
declare r record;
begin
  -- Backfill boards
  for r in select distinct x.campaign_id from public.creatives x
           join public.slots sl on sl.id = x.slot_id and sl.kind = 'board'
           where x.status = 'approved' loop
    perform public.sync_sponsor_board(r.campaign_id);
  end loop;

  -- Backfill bindings and boots
  for r in select distinct x.campaign_id from public.creatives x
           join public.slots sl on sl.id = x.slot_id and sl.kind in ('binding', 'boot')
           where x.status = 'approved' loop
    perform public.sync_sponsor_binding(r.campaign_id);
    perform public.sync_sponsor_boot(r.campaign_id);
  end loop;
end $$;
