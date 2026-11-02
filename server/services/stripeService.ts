import Stripe from 'stripe';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) return null;
  return new Stripe(secretKey.trim());
}

export interface StripeHoldData {
  bookingId: string;
  clientEmail: string;
  clientNom: string;
  equipmentName: string;
  equipmentId: string;
  montantCaution: number; // En euros (ex: 250)
  totalLocation: number;  // En euros (ex: 165)
  appUrl: string;         // URL de l'application (pour success/cancel redirects)
}

export interface StripeHoldResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Crée une Stripe Checkout Session pour :
 * 1. Encaisser le montant total de la location
 * 2. Placer une empreinte bancaire (hold) pour la caution sans la débiter
 *
 * Utilise `capture_method: 'manual'` pour la caution (PaymentIntent non capturé).
 */
export async function createStripeCheckoutSession(data: StripeHoldData): Promise<StripeHoldResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    console.warn('⚠️ [Stripe] STRIPE_SECRET_KEY non configurée — session Stripe ignorée.');
    return { success: true };
  }

  try {
    const cautionCents = Math.round(data.montantCaution * 100);

    if (cautionCents <= 0) {
      return {
        success: true,
        sessionId: undefined,
        checkoutUrl: undefined,
        paymentIntentId: undefined,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: data.clientEmail,

      // Empreinte bancaire : autorisation sans capture immédiate
      payment_intent_data: {
        capture_method: 'manual',
        description: `Caution location Matik — ${data.equipmentName} (Réf: ${data.bookingId})`,
        metadata: {
          booking_id: data.bookingId,
          equipment_id: data.equipmentId,
          equipment_name: data.equipmentName,
          client_email: data.clientEmail,
          type: 'caution_empreinte_bancaire',
        },
      },

      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Caution — ${data.equipmentName}`,
              description: `Empreinte bancaire sécurisée (non débitée). Réf: ${data.bookingId}`,
            },
            unit_amount: cautionCents,
          },
          quantity: 1,
        },
      ],

      metadata: {
        booking_id: data.bookingId,
        equipment_id: data.equipmentId,
        type: 'matik_caution_hold',
      },

      success_url: `${data.appUrl}?stripe_status=success&booking_id=${data.bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.appUrl}?stripe_status=cancel&booking_id=${data.bookingId}`,

      // Expiration de la session (30 minutes)
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    console.log(`✅ [Stripe] Checkout Session créée : ${session.id} (${data.montantCaution} €)`);

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url || undefined,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    };
  } catch (err: any) {
    console.error('❌ [Stripe] Erreur création Checkout Session :', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Erreur inconnue Stripe',
    };
  }
}

/**
 * Libère (annule) l'empreinte de caution Stripe lorsque le matériel est restitué en bon état.
 */
export async function releaseCautionHold(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { success: false, error: 'STRIPE_SECRET_KEY non configurée' };
  }
  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
    console.log(`✅ [Stripe] Caution libérée (PaymentIntent annulé) : ${paymentIntentId}`);
    return { success: true };
  } catch (err: any) {
    console.error('❌ [Stripe] Erreur libération caution :', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Capture (débite) la caution en cas de dommage.
 * @param amountToCapture montant en euros à capturer (partiel ou total)
 */
export async function captureCaution(
  paymentIntentId: string,
  amountToCapture?: number
): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { success: false, error: 'STRIPE_SECRET_KEY non configurée' };
  }
  try {
    const params: Stripe.PaymentIntentCaptureParams = {};
    if (amountToCapture !== undefined) {
      params.amount_to_capture = Math.round(amountToCapture * 100);
    }
    await stripe.paymentIntents.capture(paymentIntentId, params);
    console.log(`✅ [Stripe] Caution capturée : ${paymentIntentId} (${amountToCapture ?? 'total'} €)`);
    return { success: true };
  } catch (err: any) {
    console.error('❌ [Stripe] Erreur capture caution :', err?.message || err);
    return { success: false, error: err?.message };
  }
}
