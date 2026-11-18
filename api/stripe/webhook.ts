import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Webhook Stripe (route 100 % autonome)
 * ════════════════════════════════════════════════════════════════════════════
 * Aucun import local (`../lib/...`) : le bundler Vercel ne peut pas produire
 * l'erreur `ERR_MODULE_NOT_FOUND`.
 *
 * Signature `(req, res)` du runtime Node — `Request`/`Response` n'existe
 * qu'en runtime Edge.
 *
 * La vérification de signature exige le corps BRUT : `buildPayloadCandidates`
 * couvre les 4 formes possibles de `req.body` (absent, chaîne, Buffer, objet).
 *
 * Idempotence : chaque `event.id` est réservé dans `stripe_webhook_events`
 * avant traitement. Un rejeu Stripe est donc acquitté sans être réappliqué.
 * (Table optionnelle : si la migration 05 n'est pas exécutée, le webhook
 * continue de fonctionner, simplement sans protection contre les rejeux.)
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

// ────────────────────────────────────────────────────────────────────────────
// Idempotence
// ────────────────────────────────────────────────────────────────────────────

type EventClaim = 'new' | 'duplicate' | 'unavailable';

const claimEvent = async (event: Stripe.Event): Promise<EventClaim> => {
  try {
    const { error } = await getSupabaseAdmin()
      .from('stripe_webhook_events')
      .insert({ event_id: event.id, event_type: event.type });

    if (!error) return 'new';
    if (error.code === '23505') return 'duplicate';

    const missingTable =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      /relation .* does not exist/i.test(error.message || '');

    if (missingTable) {
      console.warn(
        '[Stripe Webhook] Table stripe_webhook_events absente — idempotence désactivée. ' +
          'Exécutez supabase/migrations/05_stripe_webhook_events.sql'
      );
      return 'unavailable';
    }

    console.warn('[Stripe Webhook] Réservation d’événement impossible :', error.message);
    return 'unavailable';
  } catch (err: any) {
    console.warn('[Stripe Webhook] Idempotence indisponible :', err?.message || err);
    return 'unavailable';
  }
};

const finishEvent = async (eventId: string, outcome: string): Promise<void> => {
  try {
    await getSupabaseAdmin()
      .from('stripe_webhook_events')
      .update({ outcome, processed_at: new Date().toISOString() })
      .eq('event_id', eventId);
  } catch (err: any) {
    console.warn('[Stripe Webhook] Traçabilité non enregistrée :', err?.message || err);
  }
};

/** Libère la réservation pour qu'un retry Stripe puisse retraiter l'événement. */
const releaseEvent = async (eventId: string): Promise<void> => {
  try {
    await getSupabaseAdmin().from('stripe_webhook_events').delete().eq('event_id', eventId);
  } catch (err: any) {
    console.warn('[Stripe Webhook] Réservation non libérée :', err?.message || err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Traitements métier
// ────────────────────────────────────────────────────────────────────────────

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

/**
 * `account.updated` : garde le statut Connect du loueur à jour dans ses
 * métadonnées, sans attendre qu'il ouvre son tableau de bord.
 */
const handleAccountUpdated = async (account: Stripe.Account): Promise<string> => {
  const userId = String(account.metadata?.matik_user_id || '').trim();
  if (!userId) return 'ignoré : compte Stripe hors plateforme Matik';

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return 'ignoré : utilisateur introuvable';

  const current = data.user.user_metadata || {};
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...current,
      stripe_connect_account_id: account.id,
      stripe_connect_charges_enabled: !!account.charges_enabled,
      stripe_connect_payouts_enabled: !!account.payouts_enabled,
      stripe_connect_details_submitted: !!account.details_submitted,
      stripe_connect_requirements:
        account.requirements?.currently_due?.slice(0, 10) ?? [],
      stripe_connect_synced_at: new Date().toISOString(),
    },
  });

  if (updateError) {
    throw new Error(`Statut Connect non synchronisé : ${updateError.message}`);
  }

  return `compte Connect synchronisé — paiements ${account.charges_enabled ? 'actifs' : 'inactifs'}`;
};

/** Clôture d'un litige : la caution est libérée si le litige est gagné. */
const handleDisputeClosed = async (dispute: Stripe.Dispute): Promise<string> => {
  const paymentIntentId = asId(dispute.payment_intent);
  if (!paymentIntentId) return 'ignoré : payment_intent absent';

  const won = dispute.status === 'won';
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('bookings')
    .update({
      stripe_caution_status: won ? 'caution_liberee' : 'litige_bloque',
      dispute_reason: `litige ${dispute.status} : ${dispute.reason || 'Stripe'}`,
    })
    .eq('stripe_caution_intent_id', paymentIntentId);

  if (error) throw new Error(`Clôture de litige non enregistrée : ${error.message}`);
  return won ? 'litige gagné — caution libérée' : 'litige clôturé — caution bloquée';
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

  // ─── Idempotence : un rejeu est acquitté sans être réappliqué ─────────────
  const claim = await claimEvent(event);
  if (claim === 'duplicate') {
    console.log(`[Stripe Webhook] ${event.type} (${event.id}) → rejeu ignoré`);
    return res.status(200).json({ received: true, duplicate: true, type: event.type });
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

      case 'charge.dispute.closed': {
        outcome = await handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;
      }

      case 'account.updated': {
        outcome = await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      }

      case 'payout.failed':
      case 'transfer.reversed': {
        // Aucune contrepartie en base : on journalise pour investigation manuelle.
        const failed = event.data.object as any;
        console.error(
          `[Stripe Webhook] ${event.type} — objet ${failed?.id || 'inconnu'} :`,
          failed?.failure_message || failed?.failure_code || 'aucun détail fourni'
        );
        outcome = `${event.type} journalisé`;
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
    // Libère la réservation pour autoriser le retry Stripe.
    await releaseEvent(event.id);
    return res
      .status(500)
      .json({ received: false, error: 'Traitement échoué, nouvelle tentative attendue.' });
  }

  await finishEvent(event.id, outcome);
  console.log(`[Stripe Webhook] ${event.type} (${event.id}) → ${outcome}`);
  return res.status(200).json({ received: true, type: event.type, outcome });
}
