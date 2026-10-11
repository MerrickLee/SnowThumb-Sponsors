-- Sponsor boards in the in-game Gear Room.
-- A sponsor names their board and writes a short description on the campaign. When their
-- Twin board graphic is approved, a gear item is created (or refreshed) automatically so
-- the board shows up in the app's Gear Room with a Visit link back to the campaign link.
-- Price starts at 35,000 points; SnowThumb can change it on the admin Gear page.

alter table public.campaigns
  add column if not exists board_name    text check (board_name is null or char_length(board_name) between 1 and 32),
  add column if not exists board_tagline text check (board_tagline is null or char_length(board_tagline) <= 90);

-- Stable gear id per campaign: safe to keep in player saves.
create or replace function public.sponsor_board_gear_id(p_campaign uuid)
returns text language sql immutable as $$
  select 'sp_' || substr(replace(p_campaign::text, '-', ''), 1, 16)
$$;

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
    -- No approved board art (anymore): hide it from the shop, keep it for players who own it.
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
    updated_at    = now();   -- price, sort and unlock stay as SnowThumb set them
end $$;

revoke all on function public.sync_sponsor_board(uuid) from public, anon, authenticated;

create or replace function public.trg_sync_sponsor_board_creative()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.slots sl where sl.id = coalesce(new.slot_id, old.slot_id) and sl.kind = 'board') then
    perform public.sync_sponsor_board(coalesce(new.campaign_id, old.campaign_id));
  end if;
  return null;
end $$;

drop trigger if exists creatives_sync_sponsor_board on public.creatives;
create trigger creatives_sync_sponsor_board
  after insert or update of status, public_url or delete on public.creatives
  for each row execute function public.trg_sync_sponsor_board_creative();

create or replace function public.trg_sync_sponsor_board_campaign()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.board_name is distinct from old.board_name or new.board_tagline is distinct from old.board_tagline then
    perform public.sync_sponsor_board(new.id);
  end if;
  return null;
end $$;

drop trigger if exists campaigns_sync_sponsor_board on public.campaigns;
create trigger campaigns_sync_sponsor_board
  after update of board_name, board_tagline on public.campaigns
  for each row execute function public.trg_sync_sponsor_board_campaign();

-- Backfill boards that are already approved.
do $$
declare r record;
begin
  for r in select distinct x.campaign_id from public.creatives x
           join public.slots sl on sl.id = x.slot_id and sl.kind = 'board'
           where x.status = 'approved' loop
    perform public.sync_sponsor_board(r.campaign_id);
  end loop;
end $$;
