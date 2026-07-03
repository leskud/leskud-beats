-- LeSkud Beats — Leads & téléchargements gratuits (MP3 tagué)
-- Exécuter dans Supabase SQL Editor

-- Leads (emails collectés via formulaire de téléchargement gratuit)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  marketing_consent boolean not null default false,
  source text not null default 'free_download',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint leads_email_unique unique (email),
  constraint leads_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index leads_email_idx on public.leads (email);
create index leads_marketing_consent_idx on public.leads (marketing_consent)
  where marketing_consent = true;
create index leads_last_seen_at_idx on public.leads (last_seen_at desc);
create index leads_created_at_idx on public.leads (created_at desc);

-- Historique des téléchargements gratuits par lead
create table public.lead_downloads (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  beat_id uuid not null references public.beats (id) on delete restrict,
  downloaded_at timestamptz not null default now(),
  user_agent text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text
);

create index lead_downloads_lead_id_idx on public.lead_downloads (lead_id);
create index lead_downloads_beat_id_idx on public.lead_downloads (beat_id);
create index lead_downloads_downloaded_at_idx on public.lead_downloads (downloaded_at desc);

-- RLS : accès réservé au service role (API) et aux admins en lecture
alter table public.leads enable row level security;
alter table public.lead_downloads enable row level security;

create policy "Admins can read leads"
  on public.leads for select
  using (public.is_admin());

create policy "Admins can read lead downloads"
  on public.lead_downloads for select
  using (public.is_admin());

-- Pas de policy INSERT/UPDATE pour anon/authenticated :
-- les écritures passent par SUPABASE_SERVICE_ROLE_KEY dans /api/free-download
