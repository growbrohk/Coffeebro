-- Percentile-style "top X%" among users who hold at least one active/redeemed voucher.
-- rank = 1 + count of users with strictly more vouchers than the caller.
-- top_percent = ceil(100 * rank / n), clamped to [1, 100]. n = 1 → 1.
-- Returns NULL when the caller has zero qualifying vouchers.

create or replace function public.my_voucher_hunter_top_percent()
returns integer
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
  select case
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
  end;
$$;

revoke all on function public.my_voucher_hunter_top_percent() from public;
grant execute on function public.my_voucher_hunter_top_percent() to authenticated;
