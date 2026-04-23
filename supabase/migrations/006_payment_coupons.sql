-- Pagos (Wompi) + cupones + referidos (UTM)
-- Aplicado via MCP Supabase o npm run db:migrate

-- Extender onboarding_sessions con columnas de pago y referral
alter table public.onboarding_sessions
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists payment_transaction_id text,
  add column if not exists amount_cents integer,
  add column if not exists currency text default 'COP',
  add column if not exists paid_at timestamptz,
  add column if not exists payment_metadata jsonb,
  add column if not exists coupon_code text,
  add column if not exists discount_cents integer default 0,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists referrer_url text;

create unique index if not exists onboarding_sessions_payment_reference_uidx
  on public.onboarding_sessions (payment_reference)
  where payment_reference is not null;

create index if not exists onboarding_sessions_utm_source_idx
  on public.onboarding_sessions (utm_source)
  where utm_source is not null;

create index if not exists onboarding_sessions_coupon_code_idx
  on public.onboarding_sessions (coupon_code)
  where coupon_code is not null;

-- Tabla de cupones
create table if not exists public.coupons (
  code text primary key,
  description text,
  discount_type text not null check (discount_type in ('full', 'percent', 'fixed')),
  discount_value integer not null default 0,
  max_uses integer,
  redemption_count integer not null default 0,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  notes text
);

create index if not exists coupons_active_idx
  on public.coupons (is_active)
  where is_active = true;

-- Log de redenciones (audit + analytics)
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_code text not null references public.coupons(code),
  session_id uuid references public.onboarding_sessions(id),
  redeemed_at timestamptz not null default now(),
  discount_cents_applied integer not null default 0
);

create index if not exists coupon_redemptions_code_idx
  on public.coupon_redemptions (coupon_code);

-- RLS: denegar anon completamente (solo service_role)
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "deny_all_anon_coupons"
  on public.coupons
  for all
  using (false);

create policy "deny_all_anon_coupon_redemptions"
  on public.coupon_redemptions
  for all
  using (false);

-- Vista para reportar conversión por fuente/campaña
create or replace view public.referral_conversions as
select
  utm_source,
  utm_campaign,
  count(*) as total_sessions,
  count(*) filter (where is_paid = true) as paid_sessions,
  coalesce(sum(amount_cents) filter (where is_paid = true), 0) as revenue_cents
from public.onboarding_sessions
where utm_source is not null
group by utm_source, utm_campaign
order by paid_sessions desc;
