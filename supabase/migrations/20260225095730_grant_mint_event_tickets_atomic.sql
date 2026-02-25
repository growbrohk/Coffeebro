-- Grant execute on mint_event_tickets_atomic to authenticated users
-- RPC enforces host/admin check internally

grant execute on function public.mint_event_tickets_atomic(uuid, int)
to authenticated;
