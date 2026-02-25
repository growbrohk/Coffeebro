-- Add redeemed_by column to vouchers table
-- Tracks which host user redeemed the voucher

alter table public.vouchers
add column if not exists redeemed_by uuid null references auth.users(id) on delete set null;

create index if not exists idx_vouchers_redeemed_by
on public.vouchers(redeemed_by);
