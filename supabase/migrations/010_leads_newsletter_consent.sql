-- Consentement newsletter explicite pour les previews gratuites

alter table public.leads
  add column if not exists accepted_newsletter_at timestamptz,
  add column if not exists consent_text text;

alter table public.lead_downloads
  add column if not exists client_ip text;

create index if not exists leads_accepted_newsletter_at_idx
  on public.leads (accepted_newsletter_at desc)
  where accepted_newsletter_at is not null;
