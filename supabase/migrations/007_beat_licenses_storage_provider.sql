-- LeSkud Beats — Provider de stockage par licence (Supabase legacy / R2)
CREATE TYPE public.storage_provider AS ENUM ('supabase', 'r2');

ALTER TABLE public.beat_licenses
  ADD COLUMN IF NOT EXISTS storage_provider public.storage_provider
  NOT NULL DEFAULT 'supabase';
