-- Grant execute permission on list_offer_participants function to authenticated users

grant execute on function public.list_offer_participants(uuid) to authenticated;
