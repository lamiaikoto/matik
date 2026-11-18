-- ============================================================================
-- MATIK — Migration 05 : idempotence des webhooks Stripe
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migrations 01 à 04.
-- Le script est idempotent : il peut être relancé sans casser les données.
--
-- Pourquoi :
--   Stripe rejoue un événement tant qu'il ne reçoit pas un 2xx. Sans registre,
--   un rejeu peut réécrire `stripe_caution_status`, redater `payment_confirmed_at`
--   ou rejouer un traitement déjà appliqué.
--
-- Fonctionnement :
--   L'API insère (event_id, event_type) AVANT traitement.
--   - insertion réussie        → première réception, on traite ;
--   - conflit de clé (23505)   → rejeu, on répond 200 sans retraiter ;
--   - échec de traitement      → la ligne est supprimée pour autoriser le retry.
--
-- Accès : RLS activée SANS aucune policy → seule la clé `service_role`
-- (utilisée par /api/stripe/webhook) peut lire et écrire cette table.
-- ============================================================================

create table if not exists public.stripe_webhook_events (
  event_id      text primary key,
  event_type    text not null,
  outcome       text,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);

comment on table public.stripe_webhook_events is
  'Registre des événements Stripe traités (idempotence). Écrit uniquement par le service_role.';

create index if not exists stripe_webhook_events_received_idx
  on public.stripe_webhook_events (received_at desc);

alter table public.stripe_webhook_events enable row level security;

-- Aucune policy volontairement : le service_role contourne la RLS, les autres
-- rôles (anon, authenticated) n'ont donc strictement aucun accès.

-- ── Purge des événements anciens (à exécuter périodiquement) ────────────────
-- Exemple : conserve 90 jours d'historique.
--   delete from public.stripe_webhook_events
--   where received_at < now() - interval '90 days';

-- FIN DE LA MIGRATION 05
-- ============================================================================
