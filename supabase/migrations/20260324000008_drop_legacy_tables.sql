-- Drop legacy tables and columns
-- Run only after app is updated to use offers

-- Drop old unique index that used coffee_offer_id (we already created offer_id one)
-- Already done in 20260324000004

-- Drop coffee_offers (data migrated to offers)
drop table if exists public.coffee_offers cascade;

-- Drop treasure_reward (data migrated to offers)
drop table if exists public.treasure_reward cascade;

-- Drop migration mapping
drop table if exists public._migrate_tr_to_offer;

-- Remove deprecated voucher columns (keep for now in case of rollback - comment out to fully clean)
-- alter table public.vouchers drop column if exists coffee_offer_id;
-- alter table public.vouchers drop column if exists treasure_reward_id;
