import Stripe from 'stripe';
import { getSupabaseAdmin } from '../lib/bookingSecurity';

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

const updateBooking = async (bookingId: string, patch: Record<string, unknown>): Promise<boolean> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('bookings').update(patch).eq('id', bookingId).select('id');

  if (error) {
    throw new Error(`Mise à jour Supabase impossible pour ${bookingId} : ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
};

const handleLocationPayment = async (session: Stripe.Checkout.Session): Promise<string> => {
  const bookingId = String(session.metadata?.booking_id || '').trim();
  if (!bookingId) return 'ignoré : booking_id absent';

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

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('bookings')
    .update({ status: 'en_attente_remise' })
    .eq('id', bookingId)
    .eq('status', 'pending_payment');

  if (error) throw new Error(`Statut non mis à jour pour ${bookingId} : ${error.message}`);

  return 'paiement confirmé';
};

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
    console.error(`[Stripe Webhook] Échec du traitement ${event.id} (${event.type}) :`, (err as Error)?.message);
    return json({ received: false, error: 'Traitement échoué, nouvelle tentative attendue.' }, 500);
  }

  console.log(`[Stripe Webhook] ${event.type} (${event.id}) → ${outcome}`);
  return json({ received: true, type: event.type, outcome });
}