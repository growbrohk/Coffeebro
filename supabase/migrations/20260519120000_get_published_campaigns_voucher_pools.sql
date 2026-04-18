-- Batch pool stats for many published campaigns (single round trip; anon-safe).

create or replace function public.get_published_campaigns_voucher_pools(p_campaign_ids uuid[])
returns table (
  campaign_id uuid,
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
    cv.campaign_id,
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
  where c.status = 'published'
    and p_campaign_ids is not null
    and array_length(p_campaign_ids, 1) is not null
    and cv.campaign_id = any(p_campaign_ids);
$$;

comment on function public.get_published_campaigns_voucher_pools(uuid[]) is
  'Per campaign_voucher line across many campaigns: quantity, minted, remaining. Null or empty p_campaign_ids returns no rows.';

grant execute on function public.get_published_campaigns_voucher_pools(uuid[]) to anon;
grant execute on function public.get_published_campaigns_voucher_pools(uuid[]) to authenticated;
