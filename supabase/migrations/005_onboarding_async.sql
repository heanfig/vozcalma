-- Soporte de generación async + tracking de pre-gen en onboarding_sessions
-- Aplicado via MCP Supabase o npm run db:migrate

alter table public.onboarding_sessions
  add column if not exists status text not null default 'ready'
    check (status in ('pending', 'ready', 'failed')),
  add column if not exists email text,
  add column if not exists source text not null default 'llm'
    check (source in ('llm', 'pregen')),
  add column if not exists pregen_category text,
  add column if not exists error_message text,
  add column if not exists completed_at timestamptz;

create index if not exists onboarding_sessions_status_idx
  on public.onboarding_sessions (status);

create index if not exists onboarding_sessions_pending_idx
  on public.onboarding_sessions (status, created_at)
  where status = 'pending';
