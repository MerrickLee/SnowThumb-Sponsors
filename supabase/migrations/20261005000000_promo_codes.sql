-- Promo codes (Stripe promotion codes entered at checkout) and a way to take them back.
-- A 100%-off code finishes checkout with nothing charged; the order is still recorded,
-- with the code, so it can be revoked later: one order, or every order that used a code.

alter type public.order_status add value if not exists 'revoked';

alter table public.campaign_orders
  add column if not exists promo_code         text,     -- as the sponsor typed it, e.g. BIGSNOWPALS
  add column if not exists promotion_code_id  text,     -- Stripe promo_...
  add column if not exists discount_cents     integer not null default 0,
  add column if not exists paid_cents         integer,  -- what Stripe actually charged
  add column if not exists revoked_at         timestamptz,
  add column if not exists revoked_by         uuid references auth.users (id);
create index if not exists campaign_orders_promo_idx on public.campaign_orders (lower(promo_code)) where promo_code is not null;

-- Takes one paid order back and rebuilds the campaign's window from the orders left.
-- An order that sat in the middle of a run of extensions shortens the end by its length.
create or replace function public.revoke_campaign_order(p_order uuid, p_by uuid default null)
returns public.campaign_orders language plpgsql security definer set search_path = '' as $$
declare
  o public.campaign_orders;
  v_len interval;
  v_start timestamptz; v_end timestamptz; v_n integer;
begin
  select * into o from public.campaign_orders where id = p_order for update;
  if not found then raise exception 'No order %', p_order; end if;
  if o.status <> 'paid' then return o; end if;

  update public.campaign_orders set status = 'revoked', revoked_at = now(), revoked_by = p_by
   where id = o.id returning * into o;
  v_len := coalesce(o.window_ends_at - o.window_starts_at, interval '0');

  select count(*), min(window_starts_at), max(window_ends_at) into v_n, v_start, v_end
    from public.campaign_orders
   where campaign_id = o.campaign_id and status = 'paid' and product = o.product;

  if v_n = 0 then
    if o.product = 'gear' then
      update public.campaigns set gear_starts_at = null, gear_ends_at = null where id = o.campaign_id;
    else
      update public.campaigns set paid_at = null, starts_at = null, ends_at = null where id = o.campaign_id;
    end if;
  else
    -- Later extensions were appended after this order, so pull the end in by its length.
    if o.window_ends_at is not null and o.window_ends_at < v_end then v_end := v_end - v_len; end if;
    if o.product = 'gear' then
      update public.campaigns set gear_starts_at = v_start, gear_ends_at = v_end where id = o.campaign_id;
    else
      update public.campaigns set starts_at = v_start, ends_at = v_end where id = o.campaign_id;
    end if;
  end if;
  return o;
end $$;

-- Every paid order that used a code (case-insensitive), revoked. Returns how many.
create or replace function public.revoke_promo_code_orders(p_code text, p_by uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in select id from public.campaign_orders
            where lower(promo_code) = lower(p_code) and status = 'paid'
            order by window_starts_at desc nulls last
  loop
    perform public.revoke_campaign_order(r.id, p_by); n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.revoke_campaign_order(uuid, uuid) from public, anon, authenticated;
revoke all on function public.revoke_promo_code_orders(text, uuid) from public, anon, authenticated;
grant execute on function public.revoke_campaign_order(uuid, uuid) to service_role;
grant execute on function public.revoke_promo_code_orders(text, uuid) to service_role;
