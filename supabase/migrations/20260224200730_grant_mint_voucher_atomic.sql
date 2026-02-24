-- Grant execute permission on mint_voucher_atomic function to authenticated users

grant execute on function public.mint_voucher_atomic(uuid, text) to authenticated;
