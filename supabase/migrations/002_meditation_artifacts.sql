create table if not exists public.meditation_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  intake_json jsonb not null default '{}'::jsonb,
  plan_json jsonb,
  script_text text,
  audio_status text not null default 'pending' check (audio_status in ('pending', 'ready', 'failed')),
  audio_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meditation_artifacts_session_id_idx
  on public.meditation_artifacts (session_id);

alter table public.meditation_artifacts enable row level security;

create policy "deny_all_anon_meditation_artifacts"
  on public.meditation_artifacts
  for all
  using (false);
