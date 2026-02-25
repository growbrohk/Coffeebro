-- RPC: assign_event_ticket
-- Assigns an available ticket to a user for an event
-- Returns the ticket with code

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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  -- Check if event exists
  select id, ticket_limit
  into v_event_record
  from public.events
  where id = p_event_id;

  if v_event_record.id is null then
    raise exception using errcode = 'P0001', message = 'EVENT_NOT_FOUND';
  end if;

  -- Check if user already has a ticket for this event
  if exists (
    select 1
    from public.event_tickets
    where event_id = p_event_id
      and assigned_to = v_user_id
      and status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REGISTERED';
  end if;

  -- Find an available ticket (active, not assigned, not redeemed)
  select id, code
  into v_ticket_record
  from public.event_tickets
  where event_id = p_event_id
    and status = 'active'
    and assigned_to is null
    and redeemed_by is null
  order by created_at asc
  limit 1
  for update skip locked;

  if v_ticket_record.id is null then
    raise exception using errcode = 'P0001', message = 'NO_TICKETS_AVAILABLE';
  end if;

  -- Store ticket info before assignment
  v_ticket_id := v_ticket_record.id;
  v_ticket_code := v_ticket_record.code;

  -- Assign the ticket to the user
  update public.event_tickets
  set assigned_to = v_user_id
  where id = v_ticket_id;

  -- Return the assigned ticket
  return query
  select v_ticket_id as ticket_id, v_ticket_code as code;
end;
$$;

grant execute on function public.assign_event_ticket(uuid)
to authenticated;
