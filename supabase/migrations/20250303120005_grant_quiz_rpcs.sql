-- Grant execute on quiz RPCs to anon and authenticated

grant execute on function public.start_quiz_anon(text, text) to anon;
grant execute on function public.start_quiz_anon(text, text) to authenticated;

grant execute on function public.complete_quiz_anon(text, text, jsonb, jsonb, text) to anon;
grant execute on function public.complete_quiz_anon(text, text, jsonb, jsonb, text) to authenticated;

grant execute on function public.get_quiz_result_by_session(text) to anon;
grant execute on function public.get_quiz_result_by_session(text) to authenticated;

grant execute on function public.claim_quiz_result(text) to authenticated;
