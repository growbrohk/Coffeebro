-- Fix ambiguous column reference 'code' in assign_event_ticket function
-- Also add on-demand ticket creation if no tickets are available but limit not reached

create or replace function public.assign_event_ticket(
  p_event_id uuid
)
returns table(ticket_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_ticket_record record;
  v_event_record record;
  v_ticket_id uuid;
  v_ticket_code text;
  v_existing_ticket_count integer;
  v_assigned_ticket_count integer;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_code text;
  v_i int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  -- Check if event exists
  select public.events.id, public.events.ticket_limit
  into v_event_record
  from public.events
  where public.events.id = p_event_id;

  if v_event_record.id is null then
    raise exception using errcode = 'P0001', message = 'EVENT_NOT_FOUND';
  end if;

  -- Check if user already has a ticket for this event
  if exists (
    select 1
    from public.event_tickets
    where public.event_tickets.event_id = p_event_id
      and public.event_tickets.assigned_to = v_user_id
      and public.event_tickets.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REGISTERED';
  end if;

  -- Find an available ticket (active, not assigned, not redeemed)
  select public.event_tickets.id, public.event_tickets.code
  into v_ticket_record
  from public.event_tickets
  where public.event_tickets.event_id = p_event_id
    and public.event_tickets.status = 'active'
    and public.event_tickets.assigned_to is null
    and public.event_tickets.redeemed_by is null
  order by public.event_tickets.created_at asc
  limit 1
  for update skip locked;

  -- If no available ticket, try to create one on-demand (if within limit)
  if v_ticket_record.id is null then
    -- Count existing tickets for this event
    select count(*)
    into v_existing_ticket_count
    from public.event_tickets
    where public.event_tickets.event_id = p_event_id;

    -- Count assigned tickets (active status)
    select count(*)
    into v_assigned_ticket_count
    from public.event_tickets
    where public.event_tickets.event_id = p_event_id
      and public.event_tickets.assigned_to is not null
      and public.event_tickets.status = 'active';

    -- Check if we can create a new ticket
    if v_event_record.ticket_limit is not null then
      -- Event has a ticket limit
      if v_assigned_ticket_count >= v_event_record.ticket_limit then
        raise exception using errcode = 'P0001', message = 'NO_TICKETS_AVAILABLE';
      end if;
    end if;
    -- If ticket_limit is null, unlimited tickets are allowed

    -- Generate a unique code
    loop
      v_code := '';
      for v_i in 1..8 loop
        v_code := v_code || substr(v_chars, floor(random() * 62)::int + 1, 1);
      end loop;

      exit when not exists (
        select 1 from public.event_tickets where public.event_tickets.code = v_code
      );
    end loop;

    -- Create the new ticket
    insert into public.event_tickets (event_id, code, status)
    values (p_event_id, v_code, 'active')
    returning public.event_tickets.id, public.event_tickets.code
    into v_ticket_record;

    v_ticket_id := v_ticket_record.id;
    v_ticket_code := v_ticket_record.code;
  else
    -- Use the existing available ticket
    v_ticket_id := v_ticket_record.id;
    v_ticket_code := v_ticket_record.code;
  end if;

  -- Assign the ticket to the user
  update public.event_tickets
  set assigned_to = v_user_id
  where public.event_tickets.id = v_ticket_id;

  -- Return the assigned ticket
  return query
  select v_ticket_id as ticket_id, v_ticket_code as code;
end;
$$;
