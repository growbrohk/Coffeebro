-- RPC: mint_event_tickets_atomic
-- Atomically mints p_count tickets for an event with unique codes
-- Caller must be host/admin of the event's org

create or replace function public.mint_event_tickets_atomic(
  p_event_id uuid,
  p_count int
)
returns table(ticket_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_event_record record;
  v_i int;
  v_j int;
  v_code text;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  -- Validate caller can manage event
  if not public.can_manage_event(v_user_id, p_event_id) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  -- Validate event exists
  select id, org_id, ticket_limit
  into v_event_record
  from public.events
  where id = p_event_id;

  if v_event_record.id is null then
    raise exception using errcode = 'P0001', message = 'EVENT_NOT_FOUND';
  end if;

  -- Validate count
  if p_count is null or p_count <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_COUNT';
  end if;

  if p_count > 5000 then
    raise exception using errcode = 'P0001', message = 'COUNT_TOO_HIGH';
  end if;

  -- Check ticket_limit not exceeded
  if v_event_record.ticket_limit is not null then
    if (select count(*) from public.event_tickets where event_id = p_event_id) + p_count > v_event_record.ticket_limit then
      raise exception using errcode = 'P0001', message = 'TICKET_LIMIT_EXCEEDED';
    end if;
  end if;

  -- Insert p_count tickets with unique codes
  for v_i in 1..p_count loop
    loop
      v_code := '';
      for v_j in 1..8 loop
        v_code := v_code || substr(v_chars, floor(random() * 62)::int + 1, 1);
      end loop;

      exit when not exists (
        select 1 from public.event_tickets where public.event_tickets.code = v_code
      );
    end loop;

    return query
    insert into public.event_tickets (event_id, code, status)
    values (p_event_id, v_code, 'active')
    returning id as ticket_id, code;
  end loop;
end;
$$;
