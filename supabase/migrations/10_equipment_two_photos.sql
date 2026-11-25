-- ============================================================================
-- MATIK — Migration 10 : limite stricte de 2 photos par annonce (F3 visuel)
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migrations 01 à 09 déjà appliquées.
--
-- Règle métier : une annonce de location expose au maximum DEUX photos.
--   - `image_url` reste la photo principale (compatibilité historique, PDF,
--     catalogue, contrats).
--   - `images` (jsonb, tableau de 0 à 2 URL) stocke la galerie courte.
--   - Contrainte CHECK : jamais plus de 2 éléments.
--
-- Aucune politique RLS supplémentaire : les politiques existantes de
-- `equipments` (lecture publique des annonces publiées, écriture par le
-- propriétaire) s'appliquent naturellement à la nouvelle colonne.
-- ============================================================================

alter table public.equipments
  add column if not exists images jsonb not null default '[]'::jsonb;

comment on column public.equipments.images is
  'Galerie courte de l''annonce : 0 à 2 URL de photos. images[0] fait foi avec image_url (photo principale).';

-- Contrainte applicative : deux photos maximum, ni plus, ni la conversion
-- historique d'un tableau en texte qui pourrait dépasser.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'equipments_images_max_2'
  ) then
    alter table public.equipments
      add constraint equipments_images_max_2
      check (
        images is null
        or jsonb_array_length(images) <= 2
      );
  end if;
end;
$$;

-- Les anciennes annonces n'ont pas de galerie : tableau vide explicite.
update public.equipments
   set images = '[]'::jsonb
 where images is null;

-- Index léger : inutile de filtrer dessus, mais la colonne est lue dans le
-- catalogue ; on conserve un plan simple sans index supplémentaire.

-- Vérification attendue après exécution :
--   select id, title, image_url, images from public.equipments limit 10;

-- FIN DE LA MIGRATION 10
-- ============================================================================
