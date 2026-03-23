-- Update list_offer_participants to use offer_id
create or replace function public.list_offer_participants(p_offer_id uuid)
returns table(
  voucher_id uuid,
  owner_id uuid,
  owner_name text,
  owner_handle text,
  selected_coffee_type text,
  status text,
  created_at timestamptz,
  redeemed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_host boolean;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  select exists (
    select 1
    from public.user_access ua
    where ua.user_id = auth.uid()
      and ua.role in ('super_admin','run_club_host')
  ) into v_is_host;

  if not v_is_host then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  return query
  select
    v.id as voucher_id,
    v.owner_id,
    coalesce(p.username, '') as owner_name,
    '' as owner_handle,
    v.selected_coffee_type,
    v.status,
    v.created_at,
    v.redeemed_at
  from public.vouchers v
  left join public.profiles p
    on p.user_id = v.owner_id
  where v.offer_id = p_offer_id
  order by v.created_at asc;
end;
$$;
