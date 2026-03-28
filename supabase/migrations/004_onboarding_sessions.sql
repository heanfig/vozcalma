-- Onboarding sessions: alivio rápido (quick) y reprogramación profunda (deep).
-- Servidor usa service role; anon denegado por RLS.

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('quick', 'deep')),
  intake_json jsonb not null default '{}'::jsonb,
  script_text text,
  audio_url text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_sessions_type_idx
  on public.onboarding_sessions (type);

create index if not exists onboarding_sessions_is_paid_idx
  on public.onboarding_sessions (is_paid);

alter table public.onboarding_sessions enable row level security;

create policy "deny_all_anon_onboarding_sessions"
  on public.onboarding_sessions
  for all
  using (false);
