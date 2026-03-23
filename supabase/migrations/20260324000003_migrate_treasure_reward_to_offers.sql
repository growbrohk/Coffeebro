-- Migrate treasure_reward to offers; create mapping table for voucher migration
create table if not exists public._migrate_tr_to_offer (
  treasure_reward_id uuid primary key,
  offer_id uuid not null references public.offers(id) on delete cascade
);

do $$
declare
  r record;
  new_id uuid;
begin
  for r in select * from public.treasure_reward order by treasure_id, sort_order
  loop
    insert into public.offers (
      source_type,
      org_id,
      name,
      offer_type,
      description,
      quantity_limit,
      treasure_id,
      sort_order
    )
    values (
      'hunt',
      r.org_id,
      r.title,
      r.offer_type,
      r.description,
      17,
      r.treasure_id,
      r.sort_order
    )
    returning id into new_id;

    insert into public._migrate_tr_to_offer (treasure_reward_id, offer_id)
    values (r.id, new_id)
    on conflict (treasure_reward_id) do update set offer_id = new_id;
  end loop;
end $$;
