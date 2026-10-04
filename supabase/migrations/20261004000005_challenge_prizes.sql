-- Sponsored challenges, launch scope: in-game prizes only (Cred and/or a sponsor board).
alter table public.challenges
  add column if not exists prize_cred integer not null default 0 check (prize_cred between 0 and 100000);

-- Send the prize to the game. Patches the live manifest function in place so this
-- migration doesn't restate the whole function.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.get_app_manifest()'::regprocedure);
  if position('prize_cred' in d) = 0 then
    d := replace(d, $r$'reward_gear_id', coalesce(reward_gear_id, ''),$r$,
                    $r$'reward_gear_id', coalesce(reward_gear_id, ''),
      'prize_cred',     coalesce(prize_cred, 0),$r$);
    execute d;
  end if;
end $$;
