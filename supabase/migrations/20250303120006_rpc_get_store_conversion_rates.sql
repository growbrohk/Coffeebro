-- RPC: get_store_conversion_rates
-- Returns quiz conversion stats for orgs the user owns or hosts.
-- p_org_ids: array of org ids (text, since store_id is text)

create or replace function public.get_store_conversion_rates(p_org_ids text[])
returns table(
  store_id text,
  starts bigint,
  signups bigint,
  conversion_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_authorized_ids text[];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return;
  end if;

  -- Build list of org ids user can access (owner or host)
  select array_agg(distinct o.id::text)
  into v_authorized_ids
  from public.orgs o
  left join public.org_hosts oh on oh.org_id = o.id and oh.user_id = v_user_id
  left join public.user_access ua on ua.user_id = v_user_id and ua.role in ('super_admin', 'run_club_host')
  where o.id::text = any(p_org_ids)
    and (o.owner_user_id = v_user_id or oh.id is not null or ua.role = 'super_admin');

  if v_authorized_ids is null or array_length(v_authorized_ids, 1) is null then
    return;
  end if;

  return query
  select
    qs.store_id,
    count(*)::bigint as starts,
    count(qs.user_id)::bigint as signups,
    case
      when count(*) = 0 then 0::numeric
      else round(100.0 * count(qs.user_id) / count(*), 1)
    end as conversion_rate
  from public.quiz_sessions qs
  where qs.store_id = any(v_authorized_ids)
  group by qs.store_id;
end;
$$;

grant execute on function public.get_store_conversion_rates(text[]) to authenticated;
