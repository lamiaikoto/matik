-- ============================================================================
-- MATIK — Migration 07 : messagerie par réservation & contacts après paiement
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run.
-- Prérequis : migrations 01 à 06 déjà appliquées.
-- Le script est idempotent : il peut être relancé sans casser les données.
--
-- Contenu :
--   1. Table `booking_messages` : messagerie interne limitée aux deux parties
--      d'une réservation, et uniquement après confirmation du paiement.
--   2. Fonction `get_my_booking_contacts()` : renvoie les coordonnées des deux
--      parties UNIQUEMENT quand `payment_confirmed_at` est renseigné.
--   3. Retrait de l'accès direct aux colonnes de contact de `bookings` pour les
--      clients authentifiés (téléphone / e-mail), afin qu'elles ne soient pas
--      lisibles avant paiement même via un appel direct à l'API Supabase.
--   4. Retrait de `bookings` du flux temps réel : le payload Realtime contient
--      la ligne complète et contournerait le filtrage par colonne.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- 1. TABLE booking_messages
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.booking_messages (
  id           uuid primary key default gen_random_uuid(),
  booking_id   text not null references public.bookings(id) on delete cascade,
  sender_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender_role  text not null check (sender_role in ('locataire', 'loueur')),
  body         text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at   timestamptz not null default now()
);

comment on table public.booking_messages is
  'Messagerie Matik par réservation : lisible et utilisable uniquement par le locataire et le loueur, après confirmation du paiement.';

create index if not exists booking_messages_booking_idx
  on public.booking_messages (booking_id, created_at);
create index if not exists booking_messages_sender_idx
  on public.booking_messages (sender_id);

alter table public.booking_messages enable row level security;

drop policy if exists "Participants read booking messages" on public.booking_messages;
drop policy if exists "Participants write booking messages" on public.booking_messages;

-- Lecture : uniquement les deux parties, et seulement si le paiement est validé.
create policy "Participants read booking messages"
  on public.booking_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_messages.booking_id
        and (b.locataire_id = auth.uid() or b.loueur_id = auth.uid())
        and b.payment_confirmed_at is not null
    )
  );

-- Écriture : l'auteur doit être l'utilisateur connecté et partie à la réservation payée.
create policy "Participants write booking messages"
  on public.booking_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      where b.id = booking_messages.booking_id
        and (b.locataire_id = auth.uid() or b.loueur_id = auth.uid())
        and b.payment_confirmed_at is not null
    )
  );

revoke all on public.booking_messages from anon;
grant select, insert on public.booking_messages to authenticated;
grant all on public.booking_messages to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 2. FONCTION get_my_booking_contacts()
-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER : la fonction lit les colonnes de contact malgré le retrait
-- des privilèges colonne. Elle ne les renvoie que pour les réservations payées
-- de l'appelant.
create or replace function public.get_my_booking_contacts()
returns table (
  booking_id   text,
  owner_name   text,
  owner_email  text,
  owner_phone  text,
  client_name  text,
  client_email text,
  client_phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id,
         b.owner_name,
         b.owner_email,
         b.owner_phone,
         b.client_name,
         b.client_email,
         b.client_phone
  from public.bookings b
  where (b.locataire_id = auth.uid() or b.loueur_id = auth.uid())
    and b.payment_confirmed_at is not null;
$$;

comment on function public.get_my_booking_contacts() is
  'Matik : coordonnées des parties, uniquement pour les réservations dont le paiement est confirmé.';

revoke all on function public.get_my_booking_contacts() from public;
grant execute on function public.get_my_booking_contacts() to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 3. RETRAIT DE L'ACCÈS DIRECT AUX COLONNES DE CONTACT
-- ════════════════════════════════════════════════════════════════════════════
-- Postgres n'applique pas un REVOKE de colonne si un GRANT table entier existe :
-- on révoque donc le SELECT table, puis on réaccorde explicitement toutes les
-- colonnes SAUF client_email, client_phone, owner_email, owner_phone.
revoke select on public.bookings from authenticated;

grant select (
  id,
  booking_reference,
  equipment_id,
  equipment_name,
  equipment_category,
  equipment_image,
  locataire_id,
  loueur_id,
  client_name,
  owner_name,
  start_date,
  end_date,
  days,
  subtotal,
  service_fee,
  total_price,
  caution_amount,
  status,
  restitution_signaled_at,
  stripe_caution_status,
  stripe_payment_intent_id,
  stripe_caution_intent_id,
  stripe_caution_session_id,
  stripe_caution_url,
  stripe_customer_id,
  stripe_payment_method_id,
  caution_authorized_at,
  caution_renewal_failed,
  caution_renewal_error,
  last_caution_renewal_at,
  renewal_count,
  dispute_reason,
  disputed_at,
  check_in_report,
  check_out_report,
  payment_confirmed_at,
  confirmation_email_sent_at,
  created_at,
  updated_at
) on public.bookings to authenticated;

-- Le service_role (API, webhook, cron) conserve l'accès complet.
grant all on public.bookings to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 4. RETRAIT DU TEMPS RÉEL SUR bookings
-- ════════════════════════════════════════════════════════════════════════════
-- Le client utilise désormais un rafraîchissement périodique. Sans cela, le
-- payload Realtime enverrait la ligne complète, coordonnées comprises.
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime drop table public.bookings;
  end if;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS (optionnelles)
-- ════════════════════════════════════════════════════════════════════════════
-- Les coordonnées ne doivent plus être lisibles directement par un client :
--   select owner_email from public.bookings limit 1;  -- doit échouer en tant
--                                                     -- qu'utilisateur authenticated
-- La fonction ne doit renvoyer que les réservations payées :
--   select * from public.get_my_booking_contacts();

-- FIN DE LA MIGRATION 07
-- ============================================================================
