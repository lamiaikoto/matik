-- ============================================================================
-- MATIK — Migration 11 : durcissement des états des lieux vidéo (F5 + workflow)
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migrations 01 à 10 déjà appliquées (08 = table/bucket vidéo).
--
-- Contenu :
--   F5. Bucket `inspection-videos` :
--       - taille maximale portée à 50 Mo (52 428 800 octets) ;
--       - uploads rangés par préfixe : `<auth.uid()>/` connecté, `anon/` visiteur ;
--       - plus de politique d'upload ouvert à tout chemin quelconque.
--   Workflow état des lieux :
--       - avant validation client : remplacement/refaite possible (route API) ;
--       - après `client_validated_at` : vidéo et métadonnées VERROUILLÉES,
--         seule la suppression (ligne + fichier de stockage) reste possible ;
--       - privilège UPDATE direct retiré aux clients (les passages serveur
--         `service_role` et la fonction de validation restent fonctionnels).
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. BUCKET `inspection-videos` — quotas et chemins (F5)
-- ════════════════════════════════════════════════════════════════════════════
update storage.buckets
   set file_size_limit = 52428800, -- 50 MiB, plafond dur côté Storage
       allowed_mime_types = array['video/webm', 'video/mp4', 'video/quicktime']
 where id = 'inspection-videos';

-- Lecture publique conservée (lien non listé, aucun listing possible).
drop policy if exists "Inspection videos public read" on storage.objects;
create policy "Inspection videos public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'inspection-videos');

-- Upload connecté : dossier de l'utilisateur uniquement.
drop policy if exists "Inspection videos upload" on storage.objects;
create policy "Inspection videos upload authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'inspection-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload visiteur (mode rapide sans compte) : dossier `anon/` uniquement.
create policy "Inspection videos upload anonymous"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'inspection-videos'
    and (storage.foldername(name))[1] = 'anon'
  );

-- Suppression par le propriétaire connecté (l'API service_role supprime
-- aussi les fichiers des créateurs anonymes et les remplacements).
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
-- 2. TABLE `video_inspections` — verrou post-validation
-- ════════════════════════════════════════════════════════════════════════════
alter table public.video_inspections
  add column if not exists replaced_at timestamptz;

comment on column public.video_inspections.replaced_at is
  'Horodatage d''une refaite de la vidéo AVANT validation client (la preuve validée n''est jamais modifiée).';

create or replace function public.guard_video_inspection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Une ligne validée ne peut jamais retrouver un état non validé.
  if old.client_validated_at is not null and new.client_validated_at is null then
    raise exception 'INSPECTION_VALIDATED_LOCKED'
      using errcode = '23P01',
            message = 'Cet état des lieux est validé par le client : la validation ne peut pas être effacée.';
  end if;

  -- Après validation : aucune modification de la preuve (vidéo + métadonnées).
  -- Seule la suppression physique (route service_role) reste autorisée.
  if old.client_validated_at is not null then
    if new.video_url             is distinct from old.video_url
    or new.video_path            is distinct from old.video_path
    or new.video_mime_type       is distinct from old.video_mime_type
    or new.video_duration_seconds is distinct from old.video_duration_seconds
    or new.item_title             is distinct from old.item_title
    or new.category               is distinct from old.category
    or new.inspection_type        is distinct from old.inspection_type
    or new.notes                  is distinct from old.notes
    or new.timezone               is distinct from old.timezone
    or new.location_label         is distinct from old.location_label
    or new.location_lat           is distinct from old.location_lat
    or new.location_lng           is distinct from old.location_lng
    then
      raise exception 'INSPECTION_VALIDATED_LOCKED'
        using errcode = '23P01',
              message = 'Vidéo validée par le client : remplacement et modification interdits. Suppression possible uniquement.';
    end if;
  end if;

  -- Avant validation : la refaite (replace) renseigne `replaced_at` et
  -- remplace la vidéo ; rien d'autre n'est gelé à ce stade.
  return new;
end;
$$;

comment on function public.guard_video_inspection_update() is
  'Matik : verrouille la vidéo et les métadonnées une fois la validation client enregistrée.';

drop trigger if exists video_inspections_guard_update on public.video_inspections;
create trigger video_inspections_guard_update
  before update on public.video_inspections
  for each row execute function public.guard_video_inspection_update();

-- Pas d'UPDATE direct côté client : la rem passe par l'API service_role,
-- la validation par la fonction SECURITY DEFINER `validate_video_inspection`.
revoke update on public.video_inspections from anon, authenticated;
grant select, insert, delete on public.video_inspections to authenticated;
grant all on public.video_inspections to service_role;

-- La fonction RPC de validation gagne la colonne de refaite dans son SELECT
-- (la signature reste compatible : colonne supplémentaire ignorée par les appels existants).
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
  replaced_at            timestamptz,
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
         v.replaced_at,
         v.created_at
  from public.video_inspections v
  where v.id = p_id;
$$;

-- FIN DE LA MIGRATION 11
-- ============================================================================
