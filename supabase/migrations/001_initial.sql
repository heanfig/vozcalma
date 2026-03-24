-- Run in Supabase SQL Editor (Dashboard → SQL)
-- Sessions & messages (app users)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_clerk_user_id_idx on public.sessions (clerk_user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_session_id_idx on public.messages (session_id);

-- Public play links (admin / WhatsApp)
create table if not exists public.play_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  audio_url text not null,
  expires_at timestamptz not null,
  source text default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists play_links_token_idx on public.play_links (token);

alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.play_links enable row level security;

-- Server uses service role only for MVP; block anon direct access
create policy "deny_all_anon_sessions" on public.sessions for all using (false);
create policy "deny_all_anon_messages" on public.messages for all using (false);
create policy "deny_all_anon_play_links" on public.play_links for all using (false);
