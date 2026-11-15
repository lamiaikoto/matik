-- ============================================================================
-- MATIK — Lot 1 : Réservations & Avis persistants (Supabase)
-- ============================================================================
-- Objectif :
--   * Sortir les réservations et les avis du localStorage du navigateur.
--   * Permettre la synchronisation temps réel multi-appareils (locataire ⇄ loueur).
--   * Appliquer des politiques RLS strictes :
--       - bookings : lisibles / modifiables uniquement par le locataire ou le loueur.
--       - reviews  : lecture publique, écriture réservée aux locations terminées.
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Le script est idempotent : il peut être relancé sans casser les données.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extension nécessaire à gen_random_uuid()
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABLE bookings
-- ----------------------------------------------------------------------------
-- `id` est la référence métier générée par l'API (ex : MAT-M8XK2-A1B2).
-- Les informations de l'équipement sont dupliquées (snapshot) afin que
-- l'historique contractuel reste lisible même si l'annonce est supprimée.
create table if not exists public.bookings (
  id                          text primary key,
  booking_reference           text,
  equipment_id                uuid references public.equipments(id) on delete set null,
  equipment_name              text not null default '',
  equipment_category          text not null default '',
  equipment_image             text not null default '',

  locataire_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loueur_id                   uuid references auth.users(id) on delete set null,

  client_name                 text not null default '',
  client_email                text not null default '',
  client_phone                text not null default '',
  owner_name                  text,
  owner_email                 text,
  owner_phone                 text,

  start_date                  date not null,
  end_date                    date not null,
  days                        integer not null default 1 check (days > 0),
  subtotal                    numeric(10, 2) not null default 0,
  service_fee                 numeric(10, 2) not null default 0,
  total_price                 numeric(10, 2) not null default 0,
  caution_amount              numeric(10, 2) not null default 0,

  status                      text not null default 'pending_payment'
                              check (status in ('pending_payment', 'en_attente_remise', 'en_cours', 'restitution_signalee', 'restitue')),
  restitution_signaled_at     timestamptz,

  stripe_caution_status       text not null default 'sequestre_sans_debit'
                              check (stripe_caution_status in ('sequestre_sans_debit', 'caution_liberee', 'litige_bloque')),
  stripe_payment_intent_id    text,
  stripe_caution_intent_id    text,
  stripe_caution_session_id   text,
  stripe_caution_url          text,
  stripe_customer_id          text,
  stripe_payment_method_id    text,
  caution_authorized_at       timestamptz,
  caution_renewal_failed      boolean not null default false,
  caution_renewal_error       text,
  last_caution_renewal_at     timestamptz,
  renewal_count               integer not null default 0,

  dispute_reason              text,
  disputed_at                 timestamptz,

  check_in_report             jsonb,
  check_out_report            jsonb,

  payment_confirmed_at        timestamptz,
  confirmation_email_sent_at  timestamptz,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint bookings_dates_chk check (end_date >= start_date)
);

comment on table public.bookings is
  'Réservations Matik : lisible et modifiable uniquement par le locataire et le loueur concernés (RLS).';

create index if not exists bookings_locataire_idx on public.bookings (locataire_id);
create index if not exists bookings_loueur_idx     on public.bookings (loueur_id);
create index if not exists bookings_equipment_idx  on public.bookings (equipment_id);
create index if not exists bookings_status_idx     on public.bookings (status);
create index if not exists bookings_created_idx    on public.bookings (created_at desc);

-- ----------------------------------------------------------------------------
-- 2. TABLE reviews
-- ----------------------------------------------------------------------------
-- Un seul avis par réservation terminée. La note est un entier de 1 à 5.
create table if not exists public.reviews (
  id                uuid primary key default gen_random_uuid(),
  booking_id        text not null unique references public.bookings(id) on delete cascade,
  equipment_id      uuid not null references public.equipments(id) on delete cascade,
  author_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name       text not null,
  author_role       text not null default 'Locataire Vérifié',
  rating            smallint not null check (rating between 1 and 5),
  comment           text not null check (char_length(btrim(comment)) between 3 and 2000),
  rental_duration   text,
  caution_restituee boolean not null default true,
  created_at        timestamptz not null default now()
);

comment on table public.reviews is
  'Avis Matik : lecture publique, dépôt réservé au locataire d''une location au statut "restitue".';

create index if not exists reviews_equipment_idx on public.reviews (equipment_id);
create index if not exists reviews_author_idx    on public.reviews (author_id);
create index if not exists reviews_created_idx   on public.reviews (created_at desc);

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS utilitaires
-- ----------------------------------------------------------------------------

-- 3.1 Horodatage automatique de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- 3.2 Le loueur est TOUJOURS déduit de l'annonce (empêche toute usurpation)
create or replace function public.set_booking_loueur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.equipment_id is not null then
    select e.owner_id into new.loueur_id
    from public.equipments e
    where e.id = new.equipment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_loueur on public.bookings;
create trigger bookings_set_loueur
  before insert on public.bookings
  for each row execute function public.set_booking_loueur();

-- 3.3 Champs immuables après création (identités, montants, équipement)
create or replace function public.guard_booking_update()
returns trigger
language plpgsql
as $$
begin
  new.id             := old.id;
  new.created_at     := old.created_at;
  new.locataire_id   := old.locataire_id;
  new.loueur_id      := old.loueur_id;
  new.equipment_id   := old.equipment_id;
  new.start_date     := old.start_date;
  new.end_date       := old.end_date;
  new.subtotal       := old.subtotal;
  new.service_fee    := old.service_fee;
  new.total_price    := old.total_price;
  new.caution_amount := old.caution_amount;
  return new;
end;
$$;

drop trigger if exists bookings_guard_update on public.bookings;
create trigger bookings_guard_update
  before update on public.bookings
  for each row execute function public.guard_booking_update();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY — bookings
-- ----------------------------------------------------------------------------
alter table public.bookings enable row level security;

drop policy if exists "Bookings visible to tenant and owner" on public.bookings;
drop policy if exists "Tenant creates own booking" on public.bookings;
drop policy if exists "Tenant and owner update booking" on public.bookings;
drop policy if exists "Tenant deletes unpaid booking" on public.bookings;

-- Lecture : uniquement le locataire ou le loueur de la réservation
create policy "Bookings visible to tenant and owner"
  on public.bookings
  for select
  to authenticated
  using (locataire_id = auth.uid() or loueur_id = auth.uid());

-- Création : le locataire ne peut créer que SA réservation
create policy "Tenant creates own booking"
  on public.bookings
  for insert
  to authenticated
  with check (locataire_id = auth.uid());

-- Mise à jour : le locataire et le loueur concernés (statuts, état des lieux, caution)
create policy "Tenant and owner update booking"
  on public.bookings
  for update
  to authenticated
  using (locataire_id = auth.uid() or loueur_id = auth.uid())
  with check (locataire_id = auth.uid() or loueur_id = auth.uid());

-- Suppression : le locataire peut annuler uniquement une réservation non payée
create policy "Tenant deletes unpaid booking"
  on public.bookings
  for delete
  to authenticated
  using (locataire_id = auth.uid() and payment_confirmed_at is null);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY — reviews
-- ----------------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists "Reviews are publicly readable" on public.reviews;
drop policy if exists "Tenant reviews own completed booking" on public.reviews;

-- Lecture : publique (catalogue + fiche équipement), y compris visiteurs anonymes
create policy "Reviews are publicly readable"
  on public.reviews
  for select
  to anon, authenticated
  using (true);

-- Écriture : uniquement l'auteur, sur SA réservation, au statut "restitue",
-- pour l'équipement réellement loué. Un avis par réservation (contrainte unique).
create policy "Tenant reviews own completed booking"
  on public.reviews
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      where b.id = reviews.booking_id
        and b.locataire_id = auth.uid()
        and b.equipment_id = reviews.equipment_id
        and b.status = 'restitue'
    )
  );

-- ----------------------------------------------------------------------------
-- 6. PRIVILÈGES
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- bookings : jamais accessible aux visiteurs anonymes
revoke all on public.bookings from anon;
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;

-- reviews : lecture publique, écriture aux utilisateurs connectés (filtrée par RLS)
grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;
grant all on public.reviews to service_role;

-- ----------------------------------------------------------------------------
-- 7. TEMPS RÉEL (Supabase Realtime)
-- ----------------------------------------------------------------------------
-- REPLICA IDENTITY FULL est requis pour recevoir les UPDATE / DELETE complets.
alter table public.bookings replica identity full;
alter table public.reviews  replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;
end;
$$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
