-- Grant execute permission on redeem_voucher_atomic to authenticated users

grant execute on function public.redeem_voucher_atomic(text) to authenticated;
