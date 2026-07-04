-- LeSkud Beats — Mise à jour des prix publics (lancement 2026-07)
UPDATE public.beat_licenses SET price_cents = 2999 WHERE license_type = 'mp3';
UPDATE public.beat_licenses SET price_cents = 4999 WHERE license_type = 'wav';
UPDATE public.beat_licenses SET price_cents = 7999 WHERE license_type = 'stems';
UPDATE public.beat_licenses SET price_cents = 12999 WHERE license_type = 'unlimited';
-- exclusive : 29900 conservé pour référence admin / ventes manuelles
