-- Add column if missing
alter table public.coffee_offers
add column if not exists offer_type text not null default '$17coffee';

-- Normalize any existing values (if any)
update public.coffee_offers
set offer_type = '$17coffee'
where offer_type in ('$17Coffee', '$17coffee');

-- Replace constraint to only allow '$17coffee'
alter table public.coffee_offers
drop constraint if exists coffee_offers_offer_type_check;

alter table public.coffee_offers
add constraint coffee_offers_offer_type_check
check (offer_type in ('$17coffee'));

-- Ensure default is '$17coffee'
alter table public.coffee_offers
alter column offer_type set default '$17coffee';
