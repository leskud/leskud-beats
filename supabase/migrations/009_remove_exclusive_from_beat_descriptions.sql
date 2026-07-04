-- LeSkud Beats — Nettoyage descriptions : retrait des mentions publiques « Exclusive »
-- Ne modifie pas la logique backend legacy (licence exclusive, sold_exclusive, etc.)

-- Phrase complète (singulier « licence »)
UPDATE public.beats
SET
  description = REPLACE(
    description,
    'Beat professionnel disponible en licence MP3, WAV, Stems et Exclusive.',
    'Beat disponible en licences MP3, WAV, Stems et Unlimited.'
  ),
  updated_at = now()
WHERE description LIKE '%Beat professionnel disponible en licence MP3, WAV, Stems et Exclusive.%';

-- Phrase complète (pluriel « licences »)
UPDATE public.beats
SET
  description = REPLACE(
    description,
    'Beat professionnel disponible en licences MP3, WAV, Stems et Exclusive.',
    'Beat disponible en licences MP3, WAV, Stems et Unlimited.'
  ),
  updated_at = now()
WHERE description LIKE '%Beat professionnel disponible en licences MP3, WAV, Stems et Exclusive.%';

-- Fragment restant (variantes partielles, descriptions custom, etc.)
UPDATE public.beats
SET
  description = REPLACE(
    description,
    'MP3, WAV, Stems et Exclusive',
    'MP3, WAV, Stems et Unlimited'
  ),
  updated_at = now()
WHERE description LIKE '%MP3, WAV, Stems et Exclusive%';

-- Vérification post-migration (beats publiés — doit retourner 0 ligne)
-- SELECT id, title, description
-- FROM public.beats
-- WHERE status = 'published'
--   AND description ILIKE '%Exclusive%';

DO $$
DECLARE
  remaining_published integer;
BEGIN
  SELECT COUNT(*) INTO remaining_published
  FROM public.beats
  WHERE status = 'published'
    AND description IS NOT NULL
    AND description ILIKE '%Exclusive%';

  IF remaining_published > 0 THEN
    RAISE WARNING
      '[009] % beat(s) publié(s) contiennent encore « Exclusive » dans la description — vérifier manuellement.',
      remaining_published;
  END IF;
END $$;
