-- Public pool stats for published campaigns (anon-safe; does not expose voucher rows).

create or replace function public.get_published_campaign_voucher_pool(p_campaign_id uuid)
returns table (
  campaign_voucher_id uuid,
  quantity integer,
  minted_count integer,
  remaining integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cv.id as campaign_voucher_id,
    cv.quantity,
    coalesce(
      (select count(*)::int from public.vouchers v where v.campaign_voucher_id = cv.id),
      0
    ) as minted_count,
    greatest(
      0,
      cv.quantity - coalesce(
        (select count(*)::int from public.vouchers v where v.campaign_voucher_id = cv.id),
        0
      )
    )::integer as remaining
  from public.campaign_vouchers cv
  join public.campaigns c on c.id = cv.campaign_id
  where cv.campaign_id = p_campaign_id
    and c.status = 'published';
$$;

comment on function public.get_published_campaign_voucher_pool(uuid) is
  'Per campaign_voucher line: quantity, minted voucher count, remaining slots. Published campaigns only; callable by anon.';

grant execute on function public.get_published_campaign_voucher_pool(uuid) to anon;
grant execute on function public.get_published_campaign_voucher_pool(uuid) to authenticated;
