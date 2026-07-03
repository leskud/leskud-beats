-- Buckets Supabase Storage (MVP LeSkud Beats)
-- Créer via Dashboard > Storage ou Supabase CLI

-- Bucket: previews (public)
--   - MP3 filigranés pour écoute
--   - Politique: lecture publique

-- Bucket: covers (public)
--   - Images carrées de couverture
--   - Politique: lecture publique

-- Bucket: beats (privé)
--   - MP3/WAV/ZIP stems livrables
--   - Politique: aucun accès public
--   - Téléchargement via signed URLs (service role côté serveur)

-- Exemple politiques RLS Storage (à adapter selon setup Supabase) :

-- insert into storage.buckets (id, name, public) values ('previews', 'previews', true);
-- insert into storage.buckets (id, name, public) values ('covers', 'covers', true);
-- insert into storage.buckets (id, name, public) values ('beats', 'beats', false);

-- Previews & covers : lecture publique
-- create policy "Public read previews" on storage.objects for select using (bucket_id = 'previews');
-- create policy "Public read covers" on storage.objects for select using (bucket_id = 'covers');

-- Beats privés : admin upload uniquement
-- create policy "Admin upload beats" on storage.objects for insert with check (bucket_id = 'beats' and public.is_admin());
-- create policy "Admin manage beats files" on storage.objects for all using (bucket_id = 'beats' and public.is_admin());
