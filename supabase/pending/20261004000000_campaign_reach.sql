-- PENDING: not applied yet (approval was cancelled). Apply when ready; the console
-- computes the same numbers live from events until then (src/lib/reach.ts).
-- Reach: how many runs a campaign's art was seen in, and by how many players.
-- Counted once per run / once per player, however many placements showed it.

create table public.campaign_daily_reach (
  day          date not null,
  sponsor_id   uuid not null references public.sponsors(id) on delete cascade,
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  runs_shown   integer not null default 0,  -- distinct runs with >= 1 impression
  players      integer not null default 0,  -- distinct installs with >= 1 impression
  refreshed_at timestamptz not null default now(),
  primary key (campaign_id, day)
);
create index campaign_daily_reach_sponsor_idx on public.campaign_daily_reach (sponsor_id, day);

alter table public.campaign_daily_reach enable row level security;
create policy reach_read on public.campaign_daily_reach for select to authenticated
  using (public.is_admin() or public.is_sponsor_member(sponsor_id));
grant select on public.campaign_daily_reach to authenticated;

-- Fast lookup of a campaign's impressions by time for the range totals below.
create index if not exists events_reach_idx on public.events (campaign_id, occurred_at)
  where type = 'impression';

-- Range totals with true distinct counts (daily rows can't be summed for players).
create or replace function public.campaign_reach(p_from date, p_to date, p_campaign uuid default null)
returns table (campaign_id uuid, runs_shown bigint, players bigint)
language sql stable security definer set search_path = '' as $$
  select e.campaign_id,
         count(distinct e.run_id) filter (where e.run_id is not null and e.run_id <> ''),
         count(distinct e.install_id)
  from public.events e
  where e.type = 'impression'
    and e.platform <> 'editor'
    and e.campaign_id is not null
    and (p_campaign is null or e.campaign_id = p_campaign)
    and (public.is_admin() or public.is_sponsor_member(e.sponsor_id))
    and e.occurred_at >= (p_from::timestamp at time zone 'America/New_York')
    and e.occurred_at <  ((p_to + 1)::timestamp at time zone 'America/New_York')
  group by e.campaign_id;
$$;
revoke execute on function public.campaign_reach(date, date, uuid) from public, anon;
grant execute on function public.campaign_reach(date, date, uuid) to authenticated;

-- Hourly rollup now also fills reach.
create or replace function public.rollup_campaign_stats(
  p_from date default ((now() at time zone 'America/New_York')::date - 2),
  p_to   date default ((now() at time zone 'America/New_York')::date))
returns void language plpgsql security definer set search_path = '' as $function$
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
    and e.platform <> 'editor'
    and e.occurred_at >= (p_from::timestamp at time zone 'America/New_York')
    and e.occurred_at <  ((p_to + 1)::timestamp at time zone 'America/New_York')
  group by 1, 2, 3, 4, 5, 6;

  delete from public.campaign_daily_reach where day between p_from and p_to;

  insert into public.campaign_daily_reach (day, sponsor_id, campaign_id, runs_shown, players, refreshed_at)
  select
    (e.occurred_at at time zone 'America/New_York')::date,
    e.sponsor_id, e.campaign_id,
    count(distinct e.run_id) filter (where e.run_id is not null and e.run_id <> ''),
    count(distinct e.install_id),
    now()
  from public.events e
  where e.type = 'impression'
    and e.sponsor_id is not null and e.campaign_id is not null
    and e.platform <> 'editor'
    and e.occurred_at >= (p_from::timestamp at time zone 'America/New_York')
    and e.occurred_at <  ((p_to + 1)::timestamp at time zone 'America/New_York')
  group by 1, 2, 3;
end $function$;
