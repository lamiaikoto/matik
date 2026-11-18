-- ============================================================================
-- MATIK — Migration 04 : durcissement sécurité
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migrations 01, 02 et 03 déjà appliquées.
-- Le script est idempotent : il peut être relancé sans casser les données.
--
-- Contenu :
--   1. Purge des e-mails et téléphones de loueurs stockés dans la colonne
--      `description` d'`equipments` (table lisible publiquement).
--   2. Verrouillage renforcé des réservations : un locataire (ou un loueur)
--      ne peut plus altérer les données contractuelles de la ligne `bookings`.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- 1. PURGE DES COORDONNÉES DU LOUEUR DANS LES ANNONCES PUBLIQUES
-- ════════════════════════════════════════════════════════════════════════════
-- Les métadonnées étaient encodées ainsi dans `description` :
--   <!-- MATIK_META:{"city":"Lyon",...,"ownerEmail":"a@b.fr","ownerPhone":"06.."} -->
-- On retire les deux clés, en conservant un JSON valide.

update public.equipments
set description = regexp_replace(
      regexp_replace(
        regexp_replace(
          description,
          '"ownerEmail"\s*:\s*"[^"]*"\s*,',
          '',
          'g'
        ),
        '"ownerPhone"\s*:\s*"[^"]*"\s*,?',
        '',
        'g'
      ),
      ',\s*}',
      '}',
      'g'
    )
where description is not null
  and description like '%MATIK_META%'
  and (description like '%"ownerEmail"%' or description like '%"ownerPhone"%');

comment on column public.equipments.description is
  'Description publique de l''annonce + métadonnées techniques (<!-- MATIK_META:... -->). '
  'Ne JAMAIS y stocker de données personnelles : la table est lisible par tous les visiteurs.';


-- ════════════════════════════════════════════════════════════════════════════
-- 2. VERROUILLAGE RENFORCÉ DES RÉSERVATIONS
-- ════════════════════════════════════════════════════════════════════════════
-- Remplace la fonction définie en migration 02. Les transitions de statut et
-- les champs Stripe/caution restent gérés comme avant ; on ajoute le gel des
-- données contractuelles (référence, snapshot matériel, coordonnées, durées).
--
-- Rappel : auth.uid() IS NULL  → service_role (webhook, cron, API) : aucune
-- restriction, ces traitements doivent pouvoir écrire librement.

create or replace function public.enforce_booking_status_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor              uuid := auth.uid();
  is_owner           boolean;
  is_tenant          boolean;
  transition_allowed boolean;
begin
  -- Service role / webhook / cron / API : aucune restriction.
  if actor is null then
    return new;
  end if;

  is_owner  := coalesce(old.loueur_id = actor, false);
  is_tenant := coalesce(old.locataire_id = actor, false);

  -- --------------------------------------------------------------------------
  -- 1. Contrôle des transitions de statut
  -- --------------------------------------------------------------------------
  if new.status is distinct from old.status then
    transition_allowed := false;

    if is_owner then
      transition_allowed :=
        (old.status = 'en_attente_remise' and new.status = 'en_cours')
        or (
          old.status in ('en_attente_remise', 'en_cours', 'restitution_signalee')
          and new.status = 'restitue'
        );
    elsif is_tenant then
      transition_allowed :=
        (
          old.status = 'pending_payment'
          and new.status = 'en_attente_remise'
          and old.payment_confirmed_at is not null
        )
        or (old.status = 'en_attente_remise' and new.status = 'en_cours')
        or (old.status = 'en_cours' and new.status = 'restitution_signalee');
    end if;

    if not transition_allowed then
      raise warning
        'Matik: transition de statut refusée pour la réservation % : % -> % (acteur %)',
        old.id, old.status, new.status, actor;

      new.status := old.status;
    end if;
  end if;

  -- --------------------------------------------------------------------------
  -- 2. Champs sensibles figés pour le locataire
  -- --------------------------------------------------------------------------
  if is_tenant and not is_owner then
    new.payment_confirmed_at        := old.payment_confirmed_at;
    new.stripe_caution_status       := old.stripe_caution_status;
    new.stripe_payment_intent_id    := old.stripe_payment_intent_id;
    new.stripe_caution_intent_id    := old.stripe_caution_intent_id;
    new.stripe_caution_session_id   := old.stripe_caution_session_id;
    new.stripe_caution_url          := old.stripe_caution_url;
    new.stripe_customer_id          := old.stripe_customer_id;
    new.stripe_payment_method_id    := old.stripe_payment_method_id;
    new.caution_authorized_at       := old.caution_authorized_at;
    new.caution_renewal_failed      := old.caution_renewal_failed;
    new.caution_renewal_error       := old.caution_renewal_error;
    new.last_caution_renewal_at     := old.last_caution_renewal_at;
    new.renewal_count               := old.renewal_count;
    new.dispute_reason              := old.dispute_reason;
    new.disputed_at                 := old.disputed_at;
  end if;

  -- --------------------------------------------------------------------------
  -- 3. Gel des données contractuelles (nouveau — migration 04)
  -- --------------------------------------------------------------------------
  -- Le locataire ne doit pas pouvoir réécrire la référence, le snapshot du
  -- matériel, ses propres coordonnées de contact utilisées dans le contrat,
  -- ni les coordonnées du loueur affichées dans l'e-mail de confirmation.
  if is_tenant and not is_owner then
    new.booking_reference           := old.booking_reference;
    new.equipment_name              := old.equipment_name;
    new.equipment_category          := old.equipment_category;
    new.equipment_image             := old.equipment_image;
    new.days                        := old.days;
    new.owner_name                  := old.owner_name;
    new.owner_email                 := old.owner_email;
    new.owner_phone                 := old.owner_phone;
    new.client_name                 := old.client_name;
    new.client_email                := old.client_email;
    new.client_phone                := old.client_phone;
    new.confirmation_email_sent_at  := old.confirmation_email_sent_at;
  end if;

  -- Le loueur ne doit pas pouvoir réécrire l'identité du locataire, la
  -- référence, le snapshot du matériel ni les coordonnées de contact.
  if is_owner and not is_tenant then
    new.booking_reference           := old.booking_reference;
    new.equipment_name              := old.equipment_name;
    new.equipment_category          := old.equipment_category;
    new.equipment_image             := old.equipment_image;
    new.days                        := old.days;
    new.client_name                 := old.client_name;
    new.client_email                := old.client_email;
    new.client_phone                := old.client_phone;
    new.owner_name                  := old.owner_name;
    new.owner_email                 := old.owner_email;
    new.owner_phone                 := old.owner_phone;
    new.payment_confirmed_at        := old.payment_confirmed_at;
    new.confirmation_email_sent_at  := old.confirmation_email_sent_at;
  end if;

  return new;
end;
$$;

comment on function public.enforce_booking_status_transitions() is
  'Matik : verrouille transitions de statut, champs Stripe/caution et données contractuelles '
  'pour le locataire et le loueur. Le service_role (auth.uid() IS NULL) n''est pas restreint.';

drop trigger if exists bookings_enforce_status on public.bookings;
create trigger bookings_enforce_status
  before update on public.bookings
  for each row execute function public.enforce_booking_status_transitions();


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION (optionnelle)
-- ════════════════════════════════════════════════════════════════════════════
-- Aucune ligne ne doit ressortir ici :
--   select id from public.equipments
--   where description like '%"ownerEmail"%' or description like '%"ownerPhone"%';

-- FIN DE LA MIGRATION 04
-- ============================================================================
