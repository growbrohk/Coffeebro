-- RPC: start_quiz_anon
-- Anon-callable. Inserts quiz_sessions row when user clicks Start.
-- Idempotent: if session_token already exists, returns OK.

create or replace function public.start_quiz_anon(
  p_session_token text,
  p_store_id text
)
returns table(status text, message text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate inputs
  if p_session_token is null or trim(p_session_token) = '' then
    return query select 'INVALID_INPUT', 'session_token required';
    return;
  end if;
  if p_store_id is null or trim(p_store_id) = '' then
    return query select 'INVALID_INPUT', 'store_id required';
    return;
  end if;

  -- Idempotent: insert only if not exists
  insert into public.quiz_sessions (store_id, session_token, started_at)
  values (p_store_id, p_session_token, now())
  on conflict (session_token) do nothing;

  return query select 'OK', 'Started';
end;
$$;
