-- Extend get_public_leaderboard: all-time period + quiz frog type per user (latest quiz_results row).
-- Must DROP first: PostgreSQL cannot change the OUT/return row type with CREATE OR REPLACE.

drop function if exists public.get_public_leaderboard(text, text);

create function public.get_public_leaderboard(
  p_kind text,
  p_period text
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  created_at timestamptz,
  run_count bigint,
  quiz_result_type text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_kind is null or p_kind not in ('coffee', 'voucher') then
    raise exception 'get_public_leaderboard: invalid p_kind';
  end if;
  if p_period is null or p_period not in ('day', 'week', 'month', 'alltime') then
    raise exception 'get_public_leaderboard: invalid p_period';
  end if;

  if p_kind = 'coffee' then
    return query
    select
      p.id,
      p.user_id,
      p.username,
      p.created_at,
      count(dc.id)::bigint as run_count,
      (
        select qr.result_type
        from public.quiz_results qr
        where qr.user_id = p.user_id
        order by qr.created_at desc
        limit 1
      ) as quiz_result_type
    from public.profiles p
    left join public.daily_coffees dc
      on dc.user_id = p.user_id
      and (
        p_period = 'alltime'
        or (p_period = 'day' and dc.coffee_date = current_date)
        or (
          p_period = 'week'
          and dc.coffee_date >= date_trunc('week', current_date)::date
          and dc.coffee_date < (date_trunc('week', current_date) + interval '1 week')::date
        )
        or (
          p_period = 'month'
          and dc.coffee_date >= date_trunc('month', current_date)::date
          and dc.coffee_date < (date_trunc('month', current_date) + interval '1 month')::date
        )
      )
    group by p.id, p.user_id, p.username, p.created_at
    order by run_count desc, p.created_at asc;
  else
    return query
    select
      p.id,
      p.user_id,
      p.username,
      p.created_at,
      count(v.id)::bigint as run_count,
      (
        select qr.result_type
        from public.quiz_results qr
        where qr.user_id = p.user_id
        order by qr.created_at desc
        limit 1
      ) as quiz_result_type
    from public.profiles p
    left join public.vouchers v
      on v.owner_id = p.user_id
      and (
        p_period = 'alltime'
        or (
          p_period = 'day'
          and v.created_at >= date_trunc('day', now())
          and v.created_at < date_trunc('day', now()) + interval '1 day'
        )
        or (
          p_period = 'week'
          and v.created_at >= date_trunc('week', now())
          and v.created_at < date_trunc('week', now()) + interval '1 week'
        )
        or (
          p_period = 'month'
          and v.created_at >= date_trunc('month', now())
          and v.created_at < date_trunc('month', now()) + interval '1 month'
        )
      )
    group by p.id, p.user_id, p.username, p.created_at
    order by run_count desc, p.created_at asc;
  end if;
end;
$$;

comment on function public.get_public_leaderboard(text, text) is
  'Leaderboard rows: coffee counts by coffee_date or voucher mint counts by created_at; optional all-time; includes latest quiz frog type.';

grant execute on function public.get_public_leaderboard(text, text) to anon;
grant execute on function public.get_public_leaderboard(text, text) to authenticated;
