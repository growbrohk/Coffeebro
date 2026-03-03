-- RPC: claim_quiz_result
-- Requires auth. Attaches user_id to quiz_sessions and quiz_results.
-- Idempotent: if already claimed, returns OK.

create or replace function public.claim_quiz_result(p_session_token text)
returns table(status text, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_updated_sessions int;
  v_updated_results int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select 'NOT_AUTHORIZED', 'Sign in required';
    return;
  end if;

  if p_session_token is null or trim(p_session_token) = '' then
    return query select 'INVALID_INPUT', 'session_token required';
    return;
  end if;

  -- Update quiz_sessions (only if user_id is null)
  update public.quiz_sessions
  set user_id = v_user_id
  where session_token = p_session_token
    and user_id is null;

  get diagnostics v_updated_sessions = row_count;

  -- Update quiz_results (only if user_id is null)
  update public.quiz_results
  set user_id = v_user_id
  where session_token = p_session_token
    and user_id is null;

  get diagnostics v_updated_results = row_count;

  -- Idempotent: if nothing to update, session may already be claimed
  if v_updated_sessions = 0 and v_updated_results = 0 then
    -- Check if already claimed by this user
    if exists (
      select 1 from public.quiz_results
      where session_token = p_session_token and user_id = v_user_id
    ) then
      return query select 'OK', 'Already claimed';
      return;
    end if;
    return query select 'NOT_FOUND', 'Session not found or already claimed by another user';
    return;
  end if;

  return query select 'OK', 'Claimed';
end;
$$;
