-- Nothing reaches players unless a SnowThumb admin approved it, whatever was paid.
-- Enforced in the database, so no code path (Stripe webhook, server actions, a bad
-- deploy, a hand-run SQL update) can publish a campaign or a file on its own.

-- 1. A campaign can only become 'approved' with an admin recorded as the approver.
create or replace function public.lock_campaign_approval()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'approved' and not exists (select 1 from public.app_admins a where a.user_id = new.approved_by) then
    raise exception 'Only a SnowThumb admin can approve a campaign.';
  end if;
  return new;
end $$;

-- Name sorts after campaigns_guard, so it sees the guard's final values.
create trigger campaigns_zz_approval_lock before insert or update on public.campaigns
  for each row execute function public.lock_campaign_approval();

-- 2. A file (banner, wrap, board art) can only become 'approved' with an admin as reviewer.
create or replace function public.lock_creative_approval()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'approved' and not exists (select 1 from public.app_admins a where a.user_id = new.reviewed_by) then
    raise exception 'Only a SnowThumb admin can approve a file.';
  end if;
  return new;
end $$;

create trigger creatives_zz_approval_lock before insert or update on public.creatives
  for each row execute function public.lock_creative_approval();

-- 3. The app manifest double-checks the same thing, so older rows without a recorded
--    admin never ship either.
do $$
declare d text;
begin
  select pg_get_functiondef('public.get_app_manifest'::regproc) into d;
  if position('aa.user_id = c.approved_by' in d) = 0 then
    d := replace(d, $r$where c.status = 'approved'$r$,
      $r$where c.status = 'approved' and exists (select 1 from public.app_admins aa where aa.user_id = c.approved_by)$r$);
    d := replace(d, $r$cr.status = 'approved' and cr.public_url is not null$r$,
      $r$cr.status = 'approved' and cr.public_url is not null and exists (select 1 from public.app_admins ra where ra.user_id = cr.reviewed_by)$r$);
    execute d;
  end if;
end $$;
