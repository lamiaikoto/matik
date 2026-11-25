-- ============================================================================
-- MATIK — Migration 09 : intégrité des réservations (F1 + F2)
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migrations 01 à 08 déjà appliquées.
--
-- Objectifs :
--   F1. Aucune ligne `bookings` ne doit être créée depuis le navigateur.
--       - Retrait du privilège d'INSERT pour `authenticated` et de la politique
--         RLS d'insertion directe (l'API service_role est la seule à écrire).
--       - Trigger `BEFORE INSERT` : force le statut initial, vide les champs
--         de paiement/Stripe, recalcule montants et caution depuis `equipments`.
--   F2. Anti-chevauchement : deux réservations actives ne peuvent pas couvrir
--       le même équipement sur des dates qui se recouvrent (contrainte
--       d'exclusion GIST sur plages de dates + vérification préalable API).
--
-- NOTE IMPORTANTE : si des réservations existantes se chevauchent déjà sur
-- des statuts actifs, la contrainte sera refusée (erreur 23P01). Diagnostiquez
-- d'abord (requête commentée en bas de fichier), corrigez/annulez les lignes
-- concernées, puis relancez ce script.
-- ============================================================================

-- ─── 0. Extension GIST pour la contrainte d'exclusion sur plages de dates ──
create extension if not exists btree_gist;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. F1 — TRIGGER DE CONTRÔLE À L'INSERTION (côté base, indépassable)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipment      public.equipments%rowtype;
  v_days           integer;
  v_subtotal       numeric(10, 2);
  v_service_fee    numeric(10, 2);
  v_total          numeric(10, 2);
  v_caution        numeric(10, 2);
begin
  -- Le client (JWT Supabase) ne doit JAMAIS écrire directement :
  -- seules les tâches sans `auth.uid()` (API service_role, webhook, cron)
  -- insèrent une réservation.
  if auth.uid() is not null then
    raise exception 'CLIENT_DIRECT_INSERT_BLOCKED'
      using errcode = '42501',
            message = 'Insertion directe de réservation refusée : passez par l''API Matik.';
  end if;

  if new.equipment_id is null then
    raise exception 'BOOKING_EQUIPMENT_REQUIRED'
      using errcode = '23502', message = 'Référence d''annonce manquante.';
  end if;

  select * into v_equipment
    from public.equipments
   where id = new.equipment_id;

  if not found then
    raise exception 'BOOKING_EQUIPMENT_NOT_FOUND'
      using errcode = '23503', message = 'Cette annonce n''existe plus.';
  end if;

  if coalesce(v_equipment.is_published, true) = false then
    raise exception 'BOOKING_EQUIPMENT_UNAVAILABLE'
      using errcode = '23P01', message = 'Cette annonce n''est plus disponible à la location.';
  end if;

  if v_equipment.owner_id is null then
    raise exception 'BOOKING_EQUIPMENT_NO_OWNER'
      using errcode = '23P01', message = 'Cette annonce n''a pas de propriétaire rattaché.';
  end if;

  -- Cohérence des dates (le contrat ne démarre jamais après sa fin).
  if new.end_date < new.start_date then
    raise exception 'BOOKING_DATES_INVALID'
      using errcode = '23514', message = 'La date de fin doit être postérieure à la date de début.';
  end if;

  -- Le loueur est toujours celui de l'annonce : inutile de faire confiance au corps.
  new.loueur_id := v_equipment.owner_id;

  -- Statut et caution figés à la création : aucun statut final (ex. `restitue`)
  -- ni montant falsifié ne peuvent venir du client.
  new.status                 := 'pending_payment';
  new.stripe_caution_status  := 'sequestre_sans_debit';

  -- Tous les champs de paiement et Stripe partent à vide ; ils ne sont remplis
  -- que par le serveur après les sessions/webhooks Stripe.
  new.payment_confirmed_at      := null;
  new.stripe_payment_intent_id  := null;
  new.stripe_caution_intent_id  := null;
  new.stripe_caution_session_id := null;
  new.stripe_caution_url        := null;
  new.stripe_customer_id        := null;
  new.stripe_payment_method_id  := null;
  new.caution_authorized_at     := null;
  new.confirmation_email_sent_at := null;

  -- Recalcul autoritaire des montants depuis l'annonce (source de vérité).
  -- Alignement sur le serveur API : nombre de jours = différence de dates,
  -- plancher à 1 jour (une réservation sur une seule journée compte pour 1).
  v_days        := greatest(1, (new.end_date - new.start_date));
  v_subtotal    := round(coalesce(v_equipment.price_per_day, 0) * v_days, 2);
  v_service_fee := round(v_subtotal * 0.10, 2);
  v_total       := round(v_subtotal + v_service_fee, 2);
  v_caution     := round(coalesce(v_equipment.deposit_amount, 0), 2);

  new.days         := v_days;
  new.subtotal     := v_subtotal;
  new.service_fee  := v_service_fee;
  new.total_price  := v_total;
  new.caution_amount := v_caution;

  return new;
end;
$$;

comment on function public.guard_booking_insert() is
  'Matik F1 : verrouille l''insertion des réservations (serveur seul, montants recalculés, statut initial forcé).';

drop trigger if exists bookings_guard_insert on public.bookings;
create trigger bookings_guard_insert
  before insert on public.bookings
  for each row execute function public.guard_booking_insert();

-- ─── 2. Retrait de l'écriture directe côté client (RLS + privilèges) ────────
-- L'API `service_role` contourne ces politiques et reste la seule rédactrice.
drop policy if exists "Tenant creates own booking" on public.bookings;

revoke insert on public.bookings from authenticated;
-- On conserve explicitement les autres privilèges utiles au workflow client :
-- select (RLS locataire/loueur), update (statuts légitimes via migration 04),
-- delete (annulation d'une réservation non payée).
grant select, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 bis. F2 — CONTRAINTE D'EXCLUSION DES PLAGES CHEVAUCHANTES
-- ════════════════════════════════════════════════════════════════════════════
-- Seules les réservations ACTIVES bloquent le calendrier :
--   - pending_payment      : paiement non confirmé, l'annonce reste disponible ;
--   - restitue              : location terminée, aucune exclusion.
-- Les statuts couverts : en_attente_remise, en_cours, restitution_signalee.
--
-- Plage semi-ouverte '[)' : une réservation finissant le jour J n'entre pas
-- en conflit avec une nouvelle commençant le jour J (enchaînement de location).

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_no_overlap_active'
  ) then
    alter table public.bookings
      add constraint bookings_no_overlap_active
      exclude using gist (
        equipment_id with =,
        daterange(start_date, end_date, '[)') with &&
      )
      where status in ('en_attente_remise', 'en_cours', 'restitution_signalee');
  end if;
end;
$$;

create index if not exists bookings_overlap_gist_idx
  on public.bookings using gist (
    equipment_id,
    daterange(start_date, end_date, '[)')
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 3. DIAGNOSTIC PRÉ-EXÉCUTION (à lancer AVANT la contrainte si elle échoue)
-- ════════════════════════════════════════════════════════════════════════════
-- Repère deux réservations actives du même équipement dont les plages se
-- recouvrent :
--
--   with active as (
--     select id, equipment_id, status, start_date, end_date
--       from public.bookings
--      where status in ('en_attente_remise','en_cours','restitution_signalee')
--        and equipment_id is not null
--   )
--   select a.id as booking_a, b.id as booking_b, a.equipment_id
--     from active a
--     join active b on a.equipment_id = b.equipment_id
--                  and a.id < b.id
--                  and a.start_date < b.end_date
--                  and b.start_date < a.end_date;
--
-- Lignes à annuler/rectifier (paiement jamais confirmé uniquement) :
--   delete from public.bookings
--    where id in ('<réservation_1>','<réservation_2>')
--      and payment_confirmed_at is null;

-- FIN DE LA MIGRATION 09
-- ============================================================================
