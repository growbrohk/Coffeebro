-- Public-safe voucher list for another user (no redemption codes). Authenticated only.

create or replace function public.get_public_user_vouchers(p_owner_id uuid)
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
  offer_type text,
  menu_item_name text,
  display_title text,
  campaign_type text,
  hint_text text,
  hint_image_url text,
  campaign_end_at timestamptz
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
    cv.offer_type,
    mi.item_name as menu_item_name,
    c.display_title,
    c.campaign_type,
    c.hint_text,
    c.hint_image_url,
    c.end_at as campaign_end_at
  from public.vouchers v
  left join public.orgs o on o.id = v.org_id
  left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
  left join public.menu_items mi on mi.id = cv.menu_item_id
  left join public.campaigns c on c.id = coalesce(cv.campaign_id, v.campaign_id)
  where v.owner_id = p_owner_id
  order by v.created_at desc;
end;
$$;

comment on function public.get_public_user_vouchers(uuid) is
  'Authenticated viewers: another user''s vouchers for display only (no codes).';

grant execute on function public.get_public_user_vouchers(uuid) to authenticated;
