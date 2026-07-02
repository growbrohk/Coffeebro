-- Combined profile voucher card stats: total voucher count + hunter top-percentile.
-- voucher_count: all vouchers owned by auth.uid() (any status).
-- top_percent: same logic as my_voucher_hunter_top_percent (active/redeemed only).

create or replace function public.my_voucher_hunter_stats()
returns table(voucher_count integer, top_percent integer)
language sql
stable
security definer
set search_path = public
as $$
  with per_user as (
    select owner_id, count(*)::bigint as c
    from public.vouchers
    where status in ('active', 'redeemed')
    group by owner_id
  ),
  my_total as (
    select count(*)::bigint as total
    from public.vouchers
    where owner_id = auth.uid()
  ),
  me as (
    select coalesce(
      (select pu.c from per_user pu where pu.owner_id = auth.uid()),
      0::bigint
    ) as my_c
  ),
  agg as (
    select
      (select my_c from me) as my_c,
      (select count(*)::bigint from per_user) as n
  )
  select
    case
      when auth.uid() is null then 0
      else (select total from my_total)::integer
    end as voucher_count,
    case
      when auth.uid() is null then null::integer
      when (select my_c from agg) = 0 then null::integer
      when (select n from agg) = 0 then null::integer
      when (select n from agg) = 1 then 1
      else (
        select least(
          100,
          greatest(
            1,
            ceil(
              100.0
              * (1 + (
                  select count(*)::bigint
                  from per_user pu
                  where pu.c > (select my_c from agg)
                ))::numeric
              / (select n from agg)::numeric
            )::integer
          )
        )
      )
    end as top_percent;
$$;

revoke all on function public.my_voucher_hunter_stats() from public;
grant execute on function public.my_voucher_hunter_stats() to authenticated;
