import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Webhook Stripe (route 100 % autonome)
 * ════════════════════════════════════════════════════════════════════════════
 * Cette route n'importe AUCUN fichier local (`../lib/...`) : le bundler Vercel
 * ne peut donc plus produire l'erreur `ERR_MODULE_NOT_FOUND`.
 *
 * Elle utilise la signature `(req, res)` du runtime Node — et non `Request`
 * / `Response` qui n'existe qu'en runtime Edge.
 *
 * La vérification de signature exige le corps BRUT de la requête. Selon la
 * configuration de la plateforme, `req.body` peut être absent, une chaîne, un
 * Buffer ou un objet déjà désérialisé : `readRawBody()` couvre les 4 cas.
 * ════════════════════════════════════════════════════════════════════════════
 */

const DEFAULT_SUPABASE_URL = 'https://inozsbkfcbkwlrozdvjj.supabase.co';
const STRIPE_API_VERSION = '2024-11-20.acacia';

let cachedAdmin: SupabaseClient | null = null;

const getSupabaseAdmin = (): SupabaseClient => {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante sur Vercel.');
  }

  if (!cachedAdmin) {
    cachedAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedAdmin;
};

const getStripe = (secretKey: string): Stripe =>
  new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION } as any);

const asId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: unknown }).id);
  }
  return null;
};

/**
 * Construit les représentations possibles du corps de requête, indispensable
 * pour valider la signature Stripe.
 *
 * La signature porte sur les octets EXACTS envoyés par Stripe. Selon la
 * configuration de la plateforme, `req.body` peut être :
 *   - absent       → on lit le flux brut (cas nominal sous Vercel) ;
 *   - une chaîne   → on l'utilise telle quelle ;
 *   - un Buffer    → on le convertit en UTF-8 ;
 *   - un objet     → la plateforme a désérialisé le JSON, les octets d'origine
 *                    sont perdus : on resérialise, puis on tente une variante
 *                    où les caractères non-ASCII sont ré-échappés (`\uXXXX`),
 *                    seule divergence réelle avec le payload Stripe d'origine.
 */
const buildPayloadCandidates = async (req: any): Promise<string[]> => {
  const body = req?.body;

  if (Buffer.isBuffer(body)) return [body.toString('utf8')];
  if (typeof body === 'string') return [body];

  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    const compact = JSON.stringify(body);
    const asciiEscaped = compact.replace(/[\u007f-\uffff]/g, (char) => {
      return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
    });
    return compact === asciiEscaped ? [compact] : [compact, asciiEscaped];
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? [raw] : [];
};

const updateBooking = async (
  bookingId: string,
  patch: Record<string, unknown>
): Promise<boolean> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .select('id');

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

  const updated = await updateBooking(bookingId, {
    stripe_payment_intent_id: asId(session.payment_intent),
    stripe_customer_id: asId(session.customer),
    payment_confirmed_at: new Date().toISOString(),
  });

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim() || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';

  if (!stripeSecret || !webhookSecret) {
    console.error(
      '[Stripe Webhook] Configuration incomplète (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).'
    );
    return res.status(503).json({ error: 'Webhook non configuré.' });
  }

  const signature = req.headers?.['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Signature Stripe manquante.' });
  }

  let event: Stripe.Event | null = null;
  let signatureError = '';

  try {
    const stripeForSignature = getStripe(stripeSecret);
    const candidates = await buildPayloadCandidates(req);

    if (candidates.length === 0) {
      signatureError = 'corps de requête vide ou déjà consommé';
    }

    for (const payload of candidates) {
      try {
        event = stripeForSignature.webhooks.constructEvent(payload, signature, webhookSecret);
        break;
      } catch (err: any) {
        signatureError = err?.message || String(err);
      }
    }
  } catch (err: any) {
    signatureError = err?.message || String(err);
  }

  if (!event) {
    console.error('[Stripe Webhook] Signature invalide :', signatureError);
    return res.status(400).json({ error: 'Signature invalide.' });
  }

  const stripe = getStripe(stripeSecret);
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
          const updated = await updateBooking(bookingId, {
            stripe_caution_status: 'caution_liberee',
          });
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
  } catch (err: any) {
    console.error(
      `[Stripe Webhook] Échec du traitement ${event.id} (${event.type}) :`,
      err?.message || err
    );
    // 500 volontaire : Stripe rejouera l'événement. Sans ce code, l'échec est définitif.
    return res
      .status(500)
      .json({ received: false, error: 'Traitement échoué, nouvelle tentative attendue.' });
  }

  console.log(`[Stripe Webhook] ${event.type} (${event.id}) → ${outcome}`);
  return res.status(200).json({ received: true, type: event.type, outcome });
}
