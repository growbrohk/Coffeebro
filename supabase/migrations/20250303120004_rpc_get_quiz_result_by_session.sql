-- RPC: get_quiz_result_by_session
-- Anon-callable. Returns result row for display (blurred or full).
-- Returns row if: (a) user_id is null, or (b) user_id = auth.uid()

create or replace function public.get_quiz_result_by_session(p_session_token text)
returns table(
  id uuid,
  user_id uuid,
  store_id text,
  answers jsonb,
  scores jsonb,
  result_type text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_token is null or trim(p_session_token) = '' then
    return;
  end if;

  return query
  select
    qr.id,
    qr.user_id,
    qr.store_id,
    qr.answers,
    qr.scores,
    qr.result_type,
    qr.created_at
  from public.quiz_results qr
  where qr.session_token = p_session_token
    and (qr.user_id is null or qr.user_id = auth.uid());
end;
$$;
