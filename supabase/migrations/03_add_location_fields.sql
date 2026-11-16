-- =============================================================================
-- Migration 03 : champs de localisation des annonces (ville, région, code postal)
-- À exécuter dans Supabase → SQL Editor (project ref inozsbkfcbkwlrozdvjj).
-- Idempotente : peut être relancée sans erreur.
-- =============================================================================

alter table public.equipments
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text;

comment on column public.equipments.city is 'Ville de retrait de l''équipement';
comment on column public.equipments.region is 'Région française de retrait (ex: Île-de-France)';
comment on column public.equipments.postal_code is 'Code postal de retrait (5 chiffres)';

-- Index utiles au filtrage du catalogue
create index if not exists equipments_region_idx on public.equipments (region);
create index if not exists equipments_city_idx on public.equipments (city);
create index if not exists equipments_postal_code_idx on public.equipments (postal_code);

-- -----------------------------------------------------------------------------
-- Reprise des annonces existantes : les métadonnées sont stockées dans la
-- description sous la forme <!-- MATIK_META:{"city":"...","region":"..."} -->
-- On ne remplit que les colonnes encore vides.
-- -----------------------------------------------------------------------------
update public.equipments
set city = nullif(trim(substring(description from '"city":"([^"]*)"')), '')
where city is null
  and description like '%MATIK_META:%';

update public.equipments
set region = nullif(trim(substring(description from '"region":"([^"]*)"')), '')
where region is null
  and description like '%MATIK_META:%';

update public.equipments
set postal_code = nullif(trim(substring(description from '"postalCode":"([^"]*)"')), '')
where postal_code is null
  and description like '%MATIK_META:%';

-- Vérification rapide après exécution :
-- select id, title, city, region, postal_code from public.equipments order by created_at desc limit 20;
