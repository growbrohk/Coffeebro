-- 7 Frogs Quiz: quiz_sessions and quiz_results
-- Persist-then-claim flow: result saved after Q11 (anon), claimed on signup

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  session_token text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  user_id uuid null references auth.users(id) on delete set null
);

create unique index uq_quiz_sessions_session_token on public.quiz_sessions(session_token);
create index idx_quiz_sessions_store_started on public.quiz_sessions(store_id, started_at);

alter table public.quiz_sessions enable row level security;

-- RLS: no direct anon access; all writes via RPCs (security definer)
create policy "quiz_sessions_select_own"
on public.quiz_sessions for select
using (user_id = auth.uid());


create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  store_id text not null,
  session_token text not null,
  answers jsonb not null,
  scores jsonb not null,
  result_type text not null,
  created_at timestamptz not null default now()
);

create unique index uq_quiz_results_session_token on public.quiz_results(session_token);

alter table public.quiz_results enable row level security;

create policy "quiz_results_select_own"
on public.quiz_results for select
using (user_id = auth.uid());
