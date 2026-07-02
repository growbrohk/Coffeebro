-- Supporting indexes for frequently hit global aggregation RPCs:
-- get_today_coffee_percentage, get_public_leaderboard, my_voucher_hunter_stats.

create index if not exists idx_daily_coffees_date
  on public.daily_coffees (coffee_date, user_id);

create index if not exists idx_vouchers_owner_created
  on public.vouchers (owner_id, created_at);

create index if not exists idx_vouchers_hunter
  on public.vouchers (owner_id)
  where status in ('active', 'redeemed');

create index if not exists idx_quiz_results_user_created
  on public.quiz_results (user_id, created_at desc);
