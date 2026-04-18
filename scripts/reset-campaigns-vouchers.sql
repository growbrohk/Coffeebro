-- One-off: wipe all campaigns, campaign voucher definitions, and minted vouchers.
-- Run manually in Supabase SQL Editor (postgres role) after a backup.
-- Do NOT add this file as an automatic migration — it is destructive.

begin;

-- 1) Required: remove voucher-linked visit logs (avoids CHECK failure vs ON DELETE SET NULL)
delete from public.daily_coffees
where log_type = 'voucher';

-- 2) All minted user vouchers
delete from public.vouchers;

-- 3) All campaigns (cascades rows in public.campaign_vouchers)
delete from public.campaigns;

commit;

-- ---------------------------------------------------------------------------
-- Optional (uncomment only if you want a deeper reset — review impact first)
-- ---------------------------------------------------------------------------
--
-- begin;
--
-- -- Org pickup spots (only if you no longer need any saved locations)
-- delete from public.org_claim_spots;
--
-- -- Full menu catalog (campaign_vouchers reference menu_items; campaigns are already gone)
-- delete from public.menu_items;
--
-- commit;
