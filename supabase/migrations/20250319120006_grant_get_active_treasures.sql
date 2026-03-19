-- Grant execute permission on get_active_treasures to authenticated users
grant execute on function public.get_active_treasures(uuid) to authenticated;
