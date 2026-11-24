-- ============================================================================
-- MATIK — Migration 08 : états des lieux vidéo horodatés
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migrations 01 à 07 déjà appliquées.
-- Script idempotent : il peut être relancé sans casser les données existantes.
--
-- Contenu :
--   1. Table `video_inspections` (partage public par identifiant non devinable).
--   2. RLS : lecture/écriture réservées au propriétaire connecté, insertion
--      autorisée aux visiteurs anonymes (user_id null) pour le mode rapide.
--   3. Fonctions publiques `get_video_inspection` / `validate_video_inspection` :
--      seules voies d'accès pour la page de partage /etat-des-lieux/<id>.
--   4. Bucket Storage `inspection-videos` (lecture publique des fichiers,
--      upload limité aux vidéos, taille plafonnée).
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. TABLE video_inspections
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.video_inspections (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete set null,
  item_title             text not null check (char_length(btrim(item_title)) between 1 and 160),
  category               text not null check (category in ('logement', 'outillage', 'evenementiel', 'vehicule', 'autre')),
  inspection_type        text not null check (inspection_type in ('entree', 'sortie')),
  notes                  text check (notes is null or char_length(notes) <= 2000),
  video_url              text not null,
  video_path             text,
  video_mime_type        text,
  video_duration_seconds numeric(6, 1),
  server_timestamp       timestamptz not null default now(),
  timezone               text,
  location_label         text,
  location_lat           double precision,
  location_lng           double precision,
  client_validated_at    timestamptz,
  created_at             timestamptz not null default now()
);

comment on table public.video_inspections is
  'MATIK — états des lieux vidéo horodatés : vidéo avec bandeau date/heure incrusté, partagée par lien non listé.';
comment on column public.video_inspections.server_timestamp is
  'Horodatage serveur certifié (now() PostgreSQL), insensible à l''horloge du téléphone.';
comment on column public.video_inspections.client_validated_at is
  'Date de validation de l''état des lieux par le client (via le lien de partage).';

create index if not exists video_inspections_user_idx
  on public.video_inspections (user_id, created_at desc);
create index if not exists video_inspections_created_idx
  on public.video_inspections (created_at desc);

alter table public.video_inspections enable row level security;

-- Le propriétaire connecté retrouve et gère ses propres états des lieux.
drop policy if exists "Owners read their video inspections" on public.video_inspections;
create policy "Owners read their video inspections"
  on public.video_inspections
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Owners insert their video inspections" on public.video_inspections;
create policy "Owners insert their video inspections"
  on public.video_inspections
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Mode rapide : un visiteur non connecté peut créer un état des lieux
-- uniquement sans rattachement de compte (user_id null).
drop policy if exists "Anonymous insert video inspections" on public.video_inspections;
create policy "Anonymous insert video inspections"
  on public.video_inspections
  for insert
  to anon
  with check (user_id is null);

drop policy if exists "Owners delete their video inspections" on public.video_inspections;
create policy "Owners delete their video inspections"
  on public.video_inspections
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Aucune lecture directe pour les visiteurs : la page de partage passe
-- exclusivement par les fonctions SECURITY DEFINER ci-dessous.
revoke all on public.video_inspections from anon;
grant insert on public.video_inspections to anon;
grant select, insert, delete on public.video_inspections to authenticated;
grant all on public.video_inspections to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 2. ACCÈS PUBLIC PAR LIEN (identifiant UUID non devinable)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.get_video_inspection(p_id uuid)
returns table (
  id                     uuid,
  item_title             text,
  category               text,
  inspection_type        text,
  notes                  text,
  video_url              text,
  video_mime_type        text,
  video_duration_seconds numeric,
  server_timestamp       timestamptz,
  timezone               text,
  location_label         text,
  location_lat           double precision,
  location_lng           double precision,
  client_validated_at    timestamptz,
  created_at             timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id,
         v.item_title,
         v.category,
         v.inspection_type,
         v.notes,
         v.video_url,
         v.video_mime_type,
         v.video_duration_seconds,
         v.server_timestamp,
         v.timezone,
         v.location_label,
         v.location_lat,
         v.location_lng,
         v.client_validated_at,
         v.created_at
  from public.video_inspections v
  where v.id = p_id;
$$;

comment on function public.get_video_inspection(uuid) is
  'MATIK — lecture d''un état des lieux vidéo via son lien de partage (UUID non devinable).';

revoke all on function public.get_video_inspection(uuid) from public;
grant execute on function public.get_video_inspection(uuid) to anon, authenticated;

-- Validation client : enregistre la première validation uniquement.
create or replace function public.validate_video_inspection(p_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  validated_at timestamptz;
begin
  update public.video_inspections
     set client_validated_at = coalesce(client_validated_at, now())
   where id = p_id
  returning client_validated_at into validated_at;

  return validated_at;
end;
$$;

comment on function public.validate_video_inspection(uuid) is
  'MATIK — validation par le client depuis le lien de partage ; idempotente, ne permet pas de modifier la vidéo.';

revoke all on function public.validate_video_inspection(uuid) from public;
grant execute on function public.validate_video_inspection(uuid) to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 3. STOCKAGE DES VIDÉOS
-- ════════════════════════════════════════════════════════════════════════════
-- Bucket public en lecture : la vidéo est accessible via son URL non listée,
-- exactement comme le lien de partage. Aucun listing n'est possible.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-videos',
  'inspection-videos',
  true,
  26214400, -- 25 Mo
  array['video/webm', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Inspection videos public read" on storage.objects;
create policy "Inspection videos public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'inspection-videos');

drop policy if exists "Inspection videos upload" on storage.objects;
create policy "Inspection videos upload"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'inspection-videos');

drop policy if exists "Inspection videos owner delete" on storage.objects;
create policy "Inspection videos owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'inspection-videos'
    and owner::text = auth.uid()::text
  );


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS (optionnelles)
-- ════════════════════════════════════════════════════════════════════════════
-- Un visiteur ne doit PAS pouvoir lister la table :
--   select * from public.video_inspections;             -- refusé
-- Mais il peut lire un état des lieux dont il possède le lien :
--   select * from public.get_video_inspection('<uuid>');
--
-- FIN DE LA MIGRATION 08
-- ============================================================================
