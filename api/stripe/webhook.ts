/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Webhook Stripe (Lot 2)
 * ════════════════════════════════════════════════════════════════════════════
 * Source de vérité des paiements. Le retour navigateur (`?stripe_status=…`)
 * ne fait plus foi : seuls les événements signés par Stripe confirment
 * un paiement ou une empreinte de caution.
 *
 * Événements traités :
 *   - checkout.session.completed / checkout.session.async_payment_succeeded
 *       · paiement de la location  → payment_confirmed_at + statut « en_attente_remise »
 *       · empreinte de caution     → intent/session/customer/payment_method
 *   - payment_intent.canceled     → caution libérée
 *   - charge.dispute.created      → caution bloquée (litige)
 *
 * Runtime Edge : le corps brut de la requête est indispensable à la vérification
 * de la signature (`stripe-signature`), Vercel ne doit donc pas parser le JSON.
 *
 * Variables d'environnement :
 *   - STRIPE_SECRET_KEY
 *   - STRIPE_WEBHOOK_SECRET
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - VITE_SUPABASE_URL | SUPABASE_URL
 * ════════════════════════════════════════════════════════════════════════════
 */
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../_lib/bookingSecurity';

export const config = { runtime: 'edge' };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim() || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';

const getStripe = (): Stripe =>
  new Stripe(stripeSecret, {
    apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient(),
  });

const asId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) return String((value as { id: unknown }).id);
  return null;
};

/** Met à jour une réservation ; renvoie `true` si au moins une ligne a été modifiée. */
const updateBooking = async (bookingId: string, patch: Record<string, unknown>): Promise<boolean> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('bookings').update(patch).eq('id', bookingId).select('id');

  if (error) {
    throw new Error(`Mise à jour Supabase impossible pour ${bookingId} : ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
};

/** Confirme le paiement de la location (une seule fois). */
const handleLocationPayment = async (session: Stripe.Checkout.Session): Promise<string> => {
  const bookingId = String(session.metadata?.booking_id || '').trim();
  if (!bookingId) return 'ignoré : booking_id absent';

  // Paiement différé (virement, prélèvement) non encore encaissé.
  if (session.payment_status && session.payment_status !== 'paid') {
    return `ignoré : paiement ${session.payment_status}`;
  }

  const patch = {
    stripe_payment_intent_id: asId(session.payment_intent),
    stripe_customer_id: asId(session.customer),
    payment_confirmed_at: new Date().toISOString(),
  };

  const updated = await updateBooking(bookingId, patch);
  if (!updated) return 'ignoré : réservation inconnue';

  // Le statut initial ne doit avancer que depuis `pending_payment`.
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('bookings')
    .update({ status: 'en_attente_remise' })
    .eq('id', bookingId)
    .eq('status', 'pending_payment');

  if (error) throw new Error(`Statut non mis à jour pour ${bookingId} : ${error.message}`);

  return 'paiement confirmé';
};

/** Enregistre l'empreinte de caution (aucun débit). */
const handleCautionHold = async (
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<string> => {
  const bookingId = String(session.metadata?.booking_id || '').trim();
  if (!bookingId) return 'ignoré : booking_id absent';

  const paymentIntentId = asId(session.payment_intent);
  let paymentMethodId: string | null = null;

  if (paymentIntentId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      paymentMethodId = asId(intent.payment_method);
    } catch (err) {
      console.warn('[Stripe Webhook] PaymentIntent caution illisible :', (err as Error)?.message);
    }
  }

  const updated = await updateBooking(bookingId, {
    stripe_caution_intent_id: paymentIntentId,
    stripe_caution_session_id: session.id,
    stripe_customer_id: asId(session.customer),
    stripe_payment_method_id: paymentMethodId,
    caution_authorized_at: new Date().toISOString(),
    stripe_caution_status: 'sequestre_sans_debit',
  });

  return updated ? 'empreinte de caution enregistrée' : 'ignoré : réservation inconnue';
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Méthode non autorisée.' }, 405);
  }

  if (!stripeSecret || !webhookSecret) {
    console.error('[Stripe Webhook] Configuration incomplète (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).');
    return json({ error: 'Webhook non configuré.' }, 503);
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return json({ error: 'Signature Stripe manquante.' }, 400);
  }

  // Corps brut indispensable : aucune désérialisation avant vérification.
  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature invalide :', (err as Error)?.message);
    return json({ error: 'Signature invalide.' }, 400);
  }

  let outcome = 'événement ignoré';

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const type = String(session.metadata?.type || '');

        if (type === 'matik_location_payment') {
          outcome = await handleLocationPayment(session);
        } else if (type === 'matik_caution_hold') {
          outcome = await handleCautionHold(stripe, session);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = String(intent.metadata?.booking_id || '').trim();
        if (bookingId) {
          const updated = await updateBooking(bookingId, { stripe_caution_status: 'caution_liberee' });
          outcome = updated ? 'caution libérée' : 'ignoré : réservation inconnue';
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId = asId(dispute.payment_intent);
        if (paymentIntentId) {
          const admin = getSupabaseAdmin();
          const { error } = await admin
            .from('bookings')
            .update({
              stripe_caution_status: 'litige_bloque',
              dispute_reason: dispute.reason || 'litige Stripe',
              disputed_at: new Date().toISOString(),
            })
            .eq('stripe_caution_intent_id', paymentIntentId);

          if (error) throw new Error(`Litige non enregistré : ${error.message}`);
          outcome = 'litige enregistré';
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // 500 → Stripe rejouera l'événement plus tard (idempotent côté base).
    console.error(`[Stripe Webhook] Échec du traitement ${event.id} (${event.type}) :`, (err as Error)?.message);
    return json({ received: false, error: 'Traitement échoué, nouvelle tentative attendue.' }, 500);
  }

  console.log(`[Stripe Webhook] ${event.type} (${event.id}) → ${outcome}`);
  return json({ received: true, type: event.type, outcome });
}
