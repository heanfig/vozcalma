-- Dashboard admin + captura de costos por generación
-- Aplicado via MCP Supabase (apply_migration) o npm run db:migrate

-- Captura de costos por generación (LLM + TTS)
create table if not exists public.meditation_costs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.onboarding_sessions(id) on delete cascade,
  llm_provider text not null default 'openrouter',
  llm_model text,
  llm_generation_id text,
  llm_prompt_tokens integer,
  llm_completion_tokens integer,
  llm_total_tokens integer,
  llm_cost_usd numeric(10,6),
  tts_provider text not null default 'elevenlabs',
  tts_chars integer,
  tts_cost_usd numeric(10,6),
  total_cost_usd numeric(10,6) generated always as (
    coalesce(llm_cost_usd, 0) + coalesce(tts_cost_usd, 0)
  ) stored,
  duration_ms integer,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists meditation_costs_session_idx
  on public.meditation_costs (session_id);
create index if not exists meditation_costs_created_idx
  on public.meditation_costs (created_at desc);

alter table public.meditation_costs enable row level security;

create policy "deny_all_anon_meditation_costs"
  on public.meditation_costs
  for all
  using (false);

-- FK opcional play_links → onboarding_sessions (queries limpias)
alter table public.play_links
  add column if not exists session_id uuid
  references public.onboarding_sessions(id) on delete set null;

create index if not exists play_links_session_idx
  on public.play_links (session_id);

-- Backfill por audio_url (best-effort)
update public.play_links pl
set session_id = os.id
from public.onboarding_sessions os
where pl.session_id is null
  and pl.audio_url = os.audio_url;

-- Vista agregada: costos diarios
create or replace view public.daily_cost_summary as
select
  date_trunc('day', created_at)::date as day,
  count(*) as generations,
  coalesce(sum(llm_cost_usd), 0) as llm_usd,
  coalesce(sum(tts_cost_usd), 0) as tts_usd,
  coalesce(sum(total_cost_usd), 0) as total_usd,
  coalesce(avg(total_cost_usd), 0) as avg_usd_per_gen
from public.meditation_costs
group by 1
order by 1 desc;
