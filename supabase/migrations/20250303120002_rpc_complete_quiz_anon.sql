-- RPC: complete_quiz_anon
-- Anon-callable. Updates quiz_sessions.completed_at and inserts quiz_results.
-- Atomic. Verifies session exists and not already completed.

create or replace function public.complete_quiz_anon(
  p_session_token text,
  p_store_id text,
  p_answers jsonb,
  p_scores jsonb,
  p_result_type text
)
returns table(status text, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
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
  if p_result_type is null or trim(p_result_type) = '' then
    return query select 'INVALID_INPUT', 'result_type required';
    return;
  end if;

  -- Lock and verify session exists, not completed
  select id into v_session_id
  from public.quiz_sessions
  where session_token = p_session_token
    and completed_at is null
    and user_id is null
  for update;

  if v_session_id is null then
    return query select 'INVALID_SESSION', 'Session not found or already completed';
    return;
  end if;

  -- Update session
  update public.quiz_sessions
  set completed_at = now()
  where id = v_session_id;

  -- Insert result (user_id null)
  insert into public.quiz_results (store_id, session_token, answers, scores, result_type)
  values (p_store_id, p_session_token, p_answers, p_scores, p_result_type);

  return query select 'OK', 'Completed';
end;
$$;
