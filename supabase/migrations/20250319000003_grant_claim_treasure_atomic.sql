-- Grant execute permission on claim_treasure_atomic to authenticated users

grant execute on function public.claim_treasure_atomic(text) to authenticated;
