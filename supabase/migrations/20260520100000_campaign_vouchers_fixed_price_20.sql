-- Add $20 fixed-price voucher tier.

alter table public.campaign_vouchers
  drop constraint if exists campaign_vouchers_offer_type_check;

alter table public.campaign_vouchers
  add constraint campaign_vouchers_offer_type_check check (
    offer_type in (
      'free',
      'b1g1',
      'fixed_price_7',
      'fixed_price_17',
      'fixed_price_20',
      'fixed_price_27'
    )
  );
