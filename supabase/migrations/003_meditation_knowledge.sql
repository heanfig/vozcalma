-- RAG ligero: líneas de estilo aprobadas (no guiones completos). Servidor usa service role.
-- Ejecutar en el SQL Editor de Supabase o vía psql con DATABASE_URL.

create table if not exists public.meditation_knowledge_snippets (
  id uuid primary key default gen_random_uuid(),
  emotion_key text not null default 'general',
  snippet_text text not null check (char_length(snippet_text) <= 800),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists meditation_knowledge_snippets_emotion_active_idx
  on public.meditation_knowledge_snippets (emotion_key, is_active);

alter table public.meditation_knowledge_snippets enable row level security;

create policy "deny_all_anon_meditation_knowledge_snippets"
  on public.meditation_knowledge_snippets
  for all
  using (false);

-- Fine-tuning futuro: marcar guiones aprobados para export JSONL (scripts/export-training-jsonl.mjs).
alter table public.meditation_artifacts
  add column if not exists approved_for_training boolean not null default false;

-- Semillas mínimas (K pequeño en código; top-2 en retrieval). Idempotente por (emotion_key, snippet_text).
insert into public.meditation_knowledge_snippets (emotion_key, snippet_text)
select v.emotion_key, v.snippet_text
from (
  values
    (
      'general',
      'Estilo de referencia: tono cálido, latinoamericano, sin tecnicismos; invitar a notar la respiración sin presionar.'
    ),
    (
      'general',
      'Líneas de estilo: frases cortas; usar … para silencios; no moralizar ni dar consejos médicos.'
    ),
    (
      'ansiedad',
      'Para ansiedad: anclar primero en respiración y sensaciones corporales antes de abrir la visualización.'
    ),
    (
      'estres',
      'Para estrés: reconocer la carga sin minimizar; si el contexto es laboral, evitar paisajes genéricos desconectados.'
    )
) as v(emotion_key, snippet_text)
where not exists (
  select 1
  from public.meditation_knowledge_snippets k
  where k.emotion_key = v.emotion_key and k.snippet_text = v.snippet_text
);
