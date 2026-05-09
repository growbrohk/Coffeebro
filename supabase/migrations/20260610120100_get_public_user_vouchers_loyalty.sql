-- Wallet RPC: support loyalty_catalog-backed vouchers (nullable campaign FKs).

drop function if exists public.get_public_user_vouchers(uuid);

create function public.get_public_user_vouchers(p_owner_id uuid)
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz,
  expires_at timestamptz,
  campaign_id uuid,
  org_id uuid,
  org_name text,
  org_logo_url text,
  org_lat double precision,
  org_lng double precision,
  org_location text,
  org_google_maps_url text,
  org_shop_type text,
  offer_type text,
  menu_item_name text,
  display_title text,
  campaign_type text,
  hint_text text,
  hint_image_url text,
  campaign_end_at timestamptz,
  claim_spot_label text,
  claim_spot_address text,
  claim_spot_lat double precision,
  claim_spot_lng double precision,
  claim_spot_google_maps_url text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if p_owner_id is null then
    raise exception 'get_public_user_vouchers: p_owner_id required';
  end if;

  return query
  select
    v.id,
    v.status,
    v.created_at,
    v.redeemed_at,
    v.expires_at,
    v.campaign_id,
    v.org_id,
    o.org_name,
    o.logo_url as org_logo_url,
    o.lat::double precision as org_lat,
    o.lng::double precision as org_lng,
    o.location as org_location,
    o.google_maps_url as org_google_maps_url,
    o.shop_type as org_shop_type,
    coalesce(cv.offer_type, 'loyalty'::text) as offer_type,
    coalesce(mi.item_name, mi_loyal.item_name) as menu_item_name,
    coalesce(c.display_title, vc.title, mi.item_name, mi_loyal.item_name, 'Loyalty reward') as display_title,
    coalesce(c.campaign_type, 'loyalty'::text) as campaign_type,
    coalesce(c.hint_text, 'Redeem with your points at this shop.'::text) as hint_text,
    c.hint_image_url,
    c.end_at as campaign_end_at,
    cs.label as claim_spot_label,
    cs.address as claim_spot_address,
    cs.lat::double precision as claim_spot_lat,
    cs.lng::double precision as claim_spot_lng,
    cs.google_maps_url as claim_spot_google_maps_url
  from public.vouchers v
  left join public.orgs o on o.id = v.org_id
  left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  left join public.menu_items mi on mi.id = cv.menu_item_id
  left join public.campaigns c on c.id = coalesce(cv.campaign_id, v.campaign_id)
  left join public.org_claim_spots cs on cs.id = c.claim_spot_id
  left join public.vouchers_catalog vc on vc.id = v.loyalty_catalog_id
  left join public.menu_items mi_loyal on mi_loyal.id = vc.menu_item_id
  where v.owner_id = p_owner_id
  order by v.created_at desc;
end;
$$;

comment on function public.get_public_user_vouchers(uuid) is
  'Authenticated viewers: another user''s vouchers for display (no codes). Supports campaign and loyalty_catalog vouchers.';

grant execute on function public.get_public_user_vouchers(uuid) to authenticated;
