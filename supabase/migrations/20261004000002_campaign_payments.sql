-- Paid runs: an approved sponsor campaign only shows in the app once it's paid for
-- (or comped by an admin). Each order buys a number of days at a fixed daily rate.
-- House sponsors never need to pay.

alter table public.campaigns
  add column if not exists requires_payment boolean not null default true,  -- false = comped by an admin
  add column if not exists paid_at timestamptz;                             -- first successful payment
alter table public.sponsors
  add column if not exists stripe_customer_id text;

create type public.order_status as enum ('pending', 'paid', 'canceled', 'refunded');

create table public.campaign_orders (
  id                     uuid primary key default gen_random_uuid(),
  campaign_id            uuid not null references public.campaigns (id) on delete cascade,
  sponsor_id             uuid not null references public.sponsors (id) on delete cascade,
  days                   integer not null check (days between 1 and 365),
  start_on               date not null,          -- America/New_York day the sponsor picked
  unit_amount_cents      integer not null check (unit_amount_cents > 0),
  amount_cents           integer not null check (amount_cents > 0),
  currency               text not null default 'usd',
  status                 public.order_status not null default 'pending',
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  window_starts_at       timestamptz,            -- what this order actually bought, set on payment
  window_ends_at         timestamptz,
  created_by             uuid references auth.users (id) default auth.uid(),
  paid_at                timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index campaign_orders_campaign_idx on public.campaign_orders (campaign_id, created_at desc);
create index campaign_orders_sponsor_idx on public.campaign_orders (sponsor_id, created_at desc);
create trigger campaign_orders_updated_at before update on public.campaign_orders
  for each row execute function public.set_updated_at();

-- Sponsors read their own orders; only the server (service role) writes them.
alter table public.campaign_orders enable row level security;
create policy orders_read on public.campaign_orders for select to authenticated
  using (public.is_admin() or public.is_sponsor_member(sponsor_id));
grant select on public.campaign_orders to authenticated;

-- Nothing that's already live loses its spot.
update public.campaigns set requires_payment = false where status in ('approved', 'paused');

-- Sponsors can't touch the payment fields.
create or replace function public.guard_campaign_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status           := 'draft';
    new.priority         := 10;
    new.weight           := 100;
    new.review_notes     := null;
    new.approved_at      := null;
    new.approved_by      := null;
    new.submitted_at     := null;
    new.requires_payment := true;
    new.paid_at          := null;
    new.starts_at        := null;   -- the paid window sets the dates
    new.ends_at          := null;
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

  new.priority         := old.priority;
  new.weight           := old.weight;
  new.review_notes     := old.review_notes;
  new.approved_at      := old.approved_at;
  new.approved_by      := old.approved_by;
  new.requires_payment := old.requires_payment;
  new.paid_at          := old.paid_at;
  new.starts_at        := old.starts_at;
  new.ends_at          := old.ends_at;
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := now();
  else
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end $$;

-- Called by the Stripe webhook (service role). Idempotent: a repeated webhook is a no-op.
-- A campaign that's still running (or scheduled) gets the days added to its end.
-- Otherwise the window starts on the picked day, or now if that day has passed.
create or replace function public.apply_campaign_payment(
  p_session_id text, p_payment_intent text default null)
returns public.campaign_orders
language plpgsql security definer set search_path = '' as $$
declare
  o public.campaign_orders;
  c public.campaigns;
  v_start timestamptz;
  v_end   timestamptz;
begin
  select * into o from public.campaign_orders where stripe_session_id = p_session_id for update;
  if not found then raise exception 'No order for session %', p_session_id; end if;
  if o.status = 'paid' then return o; end if;

  select * into c from public.campaigns where id = o.campaign_id for update;

  if c.paid_at is not null and c.ends_at is not null and c.ends_at > now() then
    v_start := c.ends_at;
    v_end   := c.ends_at + make_interval(days => o.days);
    update public.campaigns set ends_at = v_end where id = c.id;
  else
    if o.start_on > (now() at time zone 'America/New_York')::date then
      -- A future day: midnight to midnight, Eastern.
      v_start := o.start_on::timestamp at time zone 'America/New_York';
      v_end   := (o.start_on + o.days)::timestamp at time zone 'America/New_York';
    else
      -- Today (or a day that passed while they were paying): full days from right now.
      v_start := now();
      v_end   := now() + make_interval(days => o.days);
    end if;
    update public.campaigns
       set starts_at = v_start, ends_at = v_end, paid_at = coalesce(paid_at, now())
     where id = c.id;
  end if;

  update public.campaign_orders
     set status = 'paid', paid_at = now(), stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent),
         window_starts_at = v_start, window_ends_at = v_end
   where id = o.id
  returning * into o;
  return o;
end $$;
revoke all on function public.apply_campaign_payment(text, text) from public, anon, authenticated;
grant execute on function public.apply_campaign_payment(text, text) to service_role;

-- Manifest: unpaid sponsor campaigns stay out of the app.
create or replace function public.get_app_manifest()
returns jsonb language sql stable security definer set search_path = '' as $$
with live_campaigns as (
  select c.id, c.sponsor_id, c.priority, c.weight, c.link_url
  from public.campaigns c
  join public.sponsors s on s.id = c.sponsor_id and s.active
  where c.status = 'approved'
    and (s.is_house or not c.requires_payment or c.paid_at is not null)
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
