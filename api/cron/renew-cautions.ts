import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  maxDuration: 60, // 60s timeout for cron executions
};

const DEFAULT_SUPABASE_URL = 'https://inozsbkfcbkwlrozdvjj.supabase.co';

/**
 * Client Supabase en service_role — indispensable pour écrire dans `bookings`
 * alors que la RLS est active. Aucun repli sur la clé anon : une écriture
 * silencieusement rejetée par la RLS est plus dangereuse qu'une absence de client.
 */
const getSupabaseAdminForCron = () => {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

interface RenewalResult {
  bookingId?: string;
  oldPaymentIntentId: string;
  newPaymentIntentId?: string;
  cautionAuthorizedAt?: string;
  amount?: number;
  error?: string;
}

/**
 * Endpoint Vercel Cron Job : Renouvellement automatique des cautions Stripe tous les 6 jours
 *
 * Exécuté automatiquement chaque jour à 03:00 UTC (0 3 * * *)
 * URL : /api/cron/renew-cautions
 *
 * Règles métier :
 * - Cible les réservations actives (status !== 'restitue' et sans litige)
 * - Dont la date de fin n'est pas encore passée (location toujours en cours)
 * - Dont la dernière autorisation de caution remonte à 6 jours ou plus (les autorisations bancaires expirent sous 7 jours)
 * - Effectue une nouvelle pré-autorisation off-session (capture_method: 'manual') avec le Customer et PaymentMethod sauvegardés
 * - Si succès : annule l'ancienne empreinte via stripe.paymentIntents.cancel et enregistre le nouveau PaymentIntent
 * - Si échec : consigne l'erreur et marque la réservation caution_renewal_failed pour alerte dans l'Espace Loueur
 */
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  console.log(`\n================================================================`);
  console.log(`⏰ [Cron Renew Cautions] Démarrage du job à ${new Date().toISOString()}`);

  // 1. Vérification de sécurité CRON_SECRET (envoyé par Vercel Cron dans Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const cronSecret = (process.env.CRON_SECRET || '').trim();

  // Sans secret configuré, cet endpoint serait déclenchable par n'importe qui :
  // appels Stripe facturés et annulations d'empreintes bancaires en série.
  // On refuse explicitement au lieu de laisser la route ouverte.
  if (!cronSecret) {
    console.error('⛔ [Cron Renew Cautions] CRON_SECRET absent : exécution refusée.');
    return res.status(503).json({
      success: false,
      error: 'CRON_SECRET non configuré : définissez la variable sur Vercel.',
    });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('⛔ [Cron Renew Cautions] Tentative non autorisée : CRON_SECRET invalide ou absent.');
    return res.status(401).json({
      success: false,
      error: 'Non autorisé : jeton CRON_SECRET manquant ou invalide.',
    });
  }

  // 2. Initialisation Stripe
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) {
    console.error('❌ [Cron Renew Cautions] STRIPE_SECRET_KEY absente.');
    return res.status(500).json({
      success: false,
      error: 'Configuration serveur incomplète : STRIPE_SECRET_KEY non configurée.',
    });
  }

  const stripe = new Stripe(secretKey.trim(), { apiVersion: '2024-11-20.acacia' } as any);

  // 3. Récupération des PaymentIntents de caution actifs
  const renewed: RenewalResult[] = [];
  const failed: RenewalResult[] = [];
  const skipped: Array<{ id: string; bookingId?: string; reason: string }> = [];

  try {
    let paymentIntents: Stripe.PaymentIntent[] = [];

    // Tente une recherche indexée sur Stripe par métadonnées
    try {
      const searchRes = await stripe.paymentIntents.search({
        query: "metadata['type']:'caution_empreinte_bancaire' AND status:'requires_capture'",
        limit: 100,
      });
      paymentIntents = searchRes.data;
      console.log(`🔎 [Cron Renew Cautions] ${paymentIntents.length} caution(s) trouvée(s) via stripe.paymentIntents.search`);
    } catch (searchErr: any) {
      console.warn('⚠️ [Cron Renew Cautions] Recherche indexée non disponible, repli sur list() :', searchErr?.message || searchErr);
      const listRes = await stripe.paymentIntents.list({ limit: 100 });
      paymentIntents = listRes.data.filter(
        (pi) => pi.status === 'requires_capture' && pi.metadata?.type === 'caution_empreinte_bancaire'
      );
      console.log(`🔎 [Cron Renew Cautions] ${paymentIntents.length} caution(s) filtrée(s) via list()`);
    }

    const now = Date.now();
    const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

    for (const pi of paymentIntents) {
      const bookingId = pi.metadata?.booking_id || 'inconnu';
      const equipmentName = pi.metadata?.equipment_name || 'Matériel';
      const isDisputed = pi.metadata?.disputed === 'true';
      const endDate = pi.metadata?.end_date;
      const dureeJours = Number(pi.metadata?.duree_jours) || 0;

      // a. Vérifier que la caution n'est pas sous litige bloqué
      if (isDisputed) {
        skipped.push({ id: pi.id, bookingId, reason: 'Réservation en litige (caution bloquée)' });
        continue;
      }

      // b. Vérifier si la date de fin de location n'est pas encore passée
      if (endDate) {
        // Fin de journée (23:59:59) de la date de fin
        const endTimestamp = new Date(`${endDate}T23:59:59Z`).getTime();
        if (endTimestamp < now) {
          skipped.push({ id: pi.id, bookingId, reason: `Location terminée le ${endDate}` });
          continue;
        }
      }

      // c. Vérifier que la durée totale de la location justifie un renouvellement (> 7 jours)
      //    (Ou si la date de fin est dans plus de 6 jours)
      if (dureeJours > 0 && dureeJours <= 7 && !endDate) {
        skipped.push({ id: pi.id, bookingId, reason: `Durée de ${dureeJours} jours <= 7 jours` });
        continue;
      }

      // d. Calcul de l'ancienneté de l'empreinte bancaire
      const authDateStr = pi.metadata?.caution_authorized_at || new Date(pi.created * 1000).toISOString();
      const authTimestamp = new Date(authDateStr).getTime();
      const elapsedMs = now - authTimestamp;
      const daysElapsed = Math.round((elapsedMs / (1000 * 60 * 60 * 24)) * 10) / 10;

      if (elapsedMs < SIX_DAYS_MS) {
        skipped.push({
          id: pi.id,
          bookingId,
          reason: `Autorisation encore valide (${daysElapsed} j écoulés < 6 j)`,
        });
        continue;
      }

      console.log(`\n🔄 [Cron Renew Cautions] Renouvellement nécessaire pour ${bookingId} (${equipmentName}) :`);
      console.log(`   - Ancien PaymentIntent : ${pi.id}`);
      console.log(`   - Montant : ${(pi.amount / 100).toFixed(2)} ${pi.currency.toUpperCase()}`);
      console.log(`   - Jours écoulés : ${daysElapsed} jours`);

      // e. Résolution du Customer et PaymentMethod
      let customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id;
      let paymentMethodId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id;

      if (!paymentMethodId && customerId) {
        try {
          const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
          if (pms.data.length > 0) {
            paymentMethodId = pms.data[0].id;
          }
        } catch (pmErr: any) {
          console.warn(`⚠️ [Cron] Impossible de récupérer les moyens de paiement du client ${customerId} :`, pmErr?.message);
        }
      }

      if (!customerId || !paymentMethodId) {
        const errDesc = 'Customer ou PaymentMethod introuvable pour ce client';
        console.error(`❌ [Cron] Échec : ${errDesc} pour ${bookingId}`);

        try {
          await stripe.paymentIntents.update(pi.id, {
            metadata: {
              caution_renewal_failed: 'true',
              caution_renewal_error: errDesc,
              caution_renewal_failed_at: new Date().toISOString(),
            },
          });
        } catch {}

        failed.push({
          bookingId,
          oldPaymentIntentId: pi.id,
          error: errDesc,
        });
        continue;
      }

      // f. Création du nouveau PaymentIntent de caution (capture_method: 'manual', off_session: true)
      try {
        const renewalCount = Number(pi.metadata?.renewal_count || 0) + 1;
        const newAuthDate = new Date().toISOString();

        const newPi = await stripe.paymentIntents.create({
          amount: pi.amount,
          currency: pi.currency,
          customer: customerId,
          payment_method: paymentMethodId,
          capture_method: 'manual',
          confirm: true,
          off_session: true,
          description: `Renouvellement caution Matik (#${renewalCount}) — ${equipmentName} (Réf: ${bookingId})`,
          payment_method_options: {
            card: {
              request_extended_authorization: 'if_available',
            },
          },
          metadata: {
            ...pi.metadata,
            previous_payment_intent_id: pi.id,
            caution_authorized_at: newAuthDate,
            renewal_count: String(renewalCount),
            renewed_by_cron: 'true',
            caution_renewal_failed: 'false',
          },
        });

        if (newPi.status === 'requires_capture') {
          // Annulation propre de l'ancienne empreinte bancaire
          try {
            await stripe.paymentIntents.cancel(pi.id);
            console.log(`   ✅ Ancien PaymentIntent ${pi.id} annulé avec succès.`);
          } catch (cancelErr: any) {
            console.warn(`   ⚠️ Attention lors de l'annulation de l'ancien PI ${pi.id} :`, cancelErr?.message);
          }

          console.log(`   🎉 Nouveau PaymentIntent actif : ${newPi.id} (Autorisation jusqu'au prochain cycle).`);

          renewed.push({
            bookingId,
            oldPaymentIntentId: pi.id,
            newPaymentIntentId: newPi.id,
            cautionAuthorizedAt: newAuthDate,
            amount: newPi.amount / 100,
          });

          // Synchronisation en base (service_role obligatoire à cause de la RLS)
          try {
            const supabase = getSupabaseAdminForCron();
            if (!supabase) {
              console.warn(
                '⚠️ [Cron] SUPABASE_SERVICE_ROLE_KEY absente : renouvellement non synchronisé en base.'
              );
            } else {
              const { error: syncError } = await supabase
                .from('bookings')
                .update({
                  stripe_caution_intent_id: newPi.id,
                  caution_authorized_at: newAuthDate,
                  last_caution_renewal_at: newAuthDate,
                  renewal_count: renewalCount,
                  caution_renewal_failed: false,
                  caution_renewal_error: null,
                })
                .eq('id', bookingId);

              if (syncError) {
                console.error(
                  `❌ [Cron] Synchronisation Supabase impossible pour ${bookingId} :`,
                  syncError.message
                );
              }
            }
          } catch (syncErr: any) {
            console.error(`❌ [Cron] Exception Supabase pour ${bookingId} :`, syncErr?.message || syncErr);
          }
        } else {
          throw new Error(`Statut Stripe inattendu (${newPi.status}), confirmation off-session requise`);
        }
      } catch (renewErr: any) {
        const errMsg = renewErr?.message || 'Erreur lors du renouvellement off-session (plafond carte ou carte expirée)';
        console.error(`❌ [Cron] Échec renouvellement pour ${bookingId} :`, errMsg);

        // Marque l'ancien PaymentIntent comme failed pour alerte
        try {
          await stripe.paymentIntents.update(pi.id, {
            metadata: {
              caution_renewal_failed: 'true',
              caution_renewal_error: errMsg,
              caution_renewal_failed_at: new Date().toISOString(),
            },
          });
        } catch {}

        failed.push({
          bookingId,
          oldPaymentIntentId: pi.id,
          error: errMsg,
        });

        // Marquage de l'erreur en base (service_role obligatoire)
        try {
          const supabase = getSupabaseAdminForCron();
          if (supabase) {
            const { error: markError } = await supabase
              .from('bookings')
              .update({
                caution_renewal_failed: true,
                caution_renewal_error: errMsg,
              })
              .eq('id', bookingId);

            if (markError) {
              console.error(
                `❌ [Cron] Erreur de caution non enregistrée pour ${bookingId} :`,
                markError.message
              );
            }
          }
        } catch (markErr: any) {
          console.error(
            `❌ [Cron] Exception lors du marquage d'erreur ${bookingId} :`,
            markErr?.message || markErr
          );
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n🏁 [Cron Renew Cautions] Fin du job en ${duration}ms :`);
    console.log(`   - Total scanné : ${paymentIntents.length}`);
    console.log(`   - Renouvelés avec succès : ${renewed.length}`);
    console.log(`   - Échecs : ${failed.length}`);
    console.log(`   - Ignorés (non éligibles) : ${skipped.length}`);
    console.log(`================================================================\n`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      scanned: paymentIntents.length,
      renewedCount: renewed.length,
      failedCount: failed.length,
      skippedCount: skipped.length,
      renewed,
      failed,
      skipped,
    });
  } catch (globalErr: any) {
    console.error('💥 [Cron Renew Cautions] Exception globale :', globalErr);
    return res.status(500).json({
      success: false,
      error: globalErr?.message || 'Erreur interne lors de l\'exécution du cron de renouvellement',
    });
  }
}
