-- ============================================================================
-- MATIK — Migration 06 : bucket Storage pour les photos d'annonces
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migration 01 (table equipments).
-- Le script est idempotent : il peut être relancé sans casser les données.
--
-- Objectif :
--   Sortir les photos du base64 stocké dans `equipments.image_url`.
--   Le client compresse l'image à 1600 px puis l'envoie ici ; seule une URL
--   courte est enregistrée en base.
--
-- Si ce script n'est pas exécuté, l'application continue de fonctionner :
-- `src/lib/imageStorage.ts` retombe automatiquement sur une data URL compressée.
-- ============================================================================

-- ── 1. Bucket public (lecture libre, écriture authentifiée) ─────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipments',
  'equipments',
  true,
  5242880, -- 5 Mo (le client compresse bien en dessous)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 2. Politiques d'accès ──────────────────────────────────────────────────
-- Chaque utilisateur écrit dans un dossier à son UID : `equipments/<uid>/…`.
-- Impossibilité d'écraser ou de supprimer la photo d'un autre loueur.

drop policy if exists "Equipment images are publicly readable" on storage.objects;
create policy "Equipment images are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'equipments');

drop policy if exists "Owners upload their equipment images" on storage.objects;
create policy "Owners upload their equipment images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'equipments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners update their equipment images" on storage.objects;
create policy "Owners update their equipment images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'equipments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'equipments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners delete their equipment images" on storage.objects;
create policy "Owners delete their equipment images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'equipments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 3. Aide au diagnostic (optionnel) ──────────────────────────────────────
-- Liste les annonces encore stockées en base64 (à re-téléverser depuis l'éditeur) :
--   select id, title, length(image_url) as taille
--   from public.equipments
--   where image_url like 'data:image/%'
--   order by taille desc;

-- FIN DE LA MIGRATION 06
-- ============================================================================
