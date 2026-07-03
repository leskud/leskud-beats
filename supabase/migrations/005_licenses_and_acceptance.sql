-- LeSkud Beats — Licence unlimited + preuve d'acceptation CGV/licence
-- Exécuter dans Supabase SQL Editor avant déploiement du code

ALTER TYPE public.license_type ADD VALUE IF NOT EXISTS 'unlimited';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_license_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS license_version text,
  ADD COLUMN IF NOT EXISTS buyer_ip inet,
  ADD COLUMN IF NOT EXISTS buyer_user_agent text;

INSERT INTO public.beat_licenses (beat_id, license_type, price_cents, storage_path, is_available)
SELECT bl.beat_id, 'unlimited'::public.license_type, 14900, bl.storage_path, bl.is_available
FROM public.beat_licenses bl
WHERE bl.license_type = 'stems'
  AND bl.storage_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.beat_licenses u
    WHERE u.beat_id = bl.beat_id
      AND u.license_type = 'unlimited'
  );
