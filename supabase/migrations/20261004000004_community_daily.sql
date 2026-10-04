-- Community, launch scope (safe for every age): today's park, a global leaderboard with
-- auto-made names, and ghosts. Players are installs, never people: no email, no real name,
-- no free text. Only the `community` edge function (service role) reads or writes these.

create table public.community_players (
  install_id uuid primary key,
  name       text not null unique check (name ~ '^[A-Za-z ]{3,30} [0-9]{1,3}$'), -- "Blue Fox 42", made by the server
  banned     boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

create table public.daily_runs (
  id             bigint generated always as identity primary key,
  day            date not null,                          -- America/New_York day of the park
  park_key       text not null check (park_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}:[a-z0-9]{4,16}$'),
  install_id     uuid not null references public.community_players (install_id) on delete cascade,
  run_id         uuid not null unique,
  score          integer not null check (score between 0 and 2000000),
  clean_landings integer not null default 0 check (clean_landings between 0 and 500),
  tricks         integer not null default 0 check (tricks between 0 and 500),
  best_trick     text check (best_trick is null or length(best_trick) <= 40),
  duration_ms    integer not null check (duration_ms between 0 and 1800000),
  app_version    text,
  flagged        boolean not null default false,         -- hidden from leaderboards
  flag_reason    text,
  ghost          text check (ghost is null or length(ghost) <= 90000), -- kept only on a player's best run of a park
  created_at     timestamptz not null default now()
);
create index daily_runs_board_idx on public.daily_runs (park_key, score desc) where not flagged;
create index daily_runs_install_idx on public.daily_runs (install_id, park_key, score desc);
create index daily_runs_day_idx on public.daily_runs (day);

alter table public.community_players enable row level security;
alter table public.daily_runs enable row level security;
-- No policies: nothing is readable or writable with the public key. Admins read through the console.
create policy community_players_admin on public.community_players for select to authenticated using (public.is_admin());
create policy daily_runs_admin on public.daily_runs for select to authenticated using (public.is_admin());

-- One leaderboard: each player's best unflagged run on a park, plus the caller's own row.
create or replace function public.community_leaderboard(p_park text, p_install uuid, p_limit integer default 20)
returns jsonb language sql stable security definer set search_path = '' as $$
  with best as (
    select distinct on (r.install_id) r.id, r.install_id, r.score, r.best_trick, r.ghost is not null as has_ghost
    from public.daily_runs r
    where r.park_key = p_park and not r.flagged
    order by r.install_id, r.score desc, r.created_at
  ), ranked as (
    select b.*, p.name, rank() over (order by b.score desc) as rnk
    from best b join public.community_players p on p.install_id = b.install_id and not p.banned
  )
  select jsonb_build_object(
    'park', p_park,
    'players', (select count(*) from ranked),
    'top', coalesce((select jsonb_agg(jsonb_build_object('rank', rnk, 'name', name, 'score', score,
              'best_trick', coalesce(best_trick, ''), 'has_ghost', has_ghost, 'run', id, 'me', install_id = p_install) order by rnk, id)
            from ranked where rnk <= greatest(1, least(p_limit, 100))), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rnk, 'name', name, 'score', score, 'best_trick', coalesce(best_trick, ''),
              'has_ghost', has_ghost, 'run', id, 'me', true) from ranked where install_id = p_install));
$$;
revoke all on function public.community_leaderboard(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.community_leaderboard(text, uuid, integer) to service_role;
