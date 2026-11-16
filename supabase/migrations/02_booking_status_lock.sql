-- ============================================================================
-- MATIK — Lot 3 : Verrouillage des statuts de réservation
-- ============================================================================
-- Objectif :
--   * Empêcher un locataire de clôturer lui-même une location (`restitue`).
--   * Réserver la libération de caution et les statuts finaux au loueur
--     (`loueur_id`) et aux traitements serveur (service_role / webhooks).
--
-- Règles appliquées (trigger BEFORE UPDATE sur public.bookings) :
--
--   auth.uid() IS NULL  → service_role, webhook Stripe, cron, API :
--                         aucune restriction.
--
--   Locataire (locataire_id = auth.uid()) :
--       pending_payment     → en_attente_remise  (uniquement si le paiement
--                                                 a déjà été confirmé par le webhook)
--       en_attente_remise   → en_cours
--       en_cours            → restitution_signalee
--       ❌ toute autre transition est refusée (dont `restitue`)
--       ❌ champs Stripe / caution / litige figés
--
--   Loueur (loueur_id = auth.uid()) :
--       en_attente_remise   → en_cours
--       en_attente_remise   → restitue
--       en_cours            → restitue
--       restitution_signalee→ restitue
--       (il peut également libérer la caution : stripe_caution_status)
--
-- Les transitions refusées ne lèvent pas d'exception : elles sont annulées
-- (new.status := old.status) et journalisées via RAISE WARNING, afin de ne pas
-- perdre le reste du patch (photos, états des lieux, etc.).
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Le script est idempotent : il peut être relancé sans casser les données.
-- ============================================================================

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
        -- Paiement confirmé côté serveur par le webhook Stripe.
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
  -- Seuls le loueur et le service_role (webhook, API, cron) peuvent modifier
  -- les identifiants Stripe, l'état de la caution et les données de litige.
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

  return new;
end;
$$;

comment on function public.enforce_booking_status_transitions() is
  'Matik : verrouille les transitions de statut et les champs Stripe/caution pour le locataire.';

drop trigger if exists bookings_enforce_status on public.bookings;
create trigger bookings_enforce_status
  before update on public.bookings
  for each row execute function public.enforce_booking_status_transitions();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
