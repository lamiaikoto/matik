import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * Route 100 % autonome : aucun import local, donc aucune dépendance à
 * `api/lib/` au moment du bundling Vercel.
 *
 * Actions supportées (POST JSON) :
 *   - create_account     : crée le compte Express si besoin, renvoie un lien d'onboarding
 *   - get_account_status : renvoie l'état du compte Connect
 *   - create_login_link  : renvoie un lien vers le Dashboard Express du loueur
 */

const DEFAULT_SUPABASE_URL = 'https://inozsbkfcbkwlrozdvjj.supabase.co';
const DEFAULT_APP_URL = 'https://matikilou.com';

/** URL publique de l'app, sans jamais faire confiance à l'en-tête Origin (open redirect). */
const getPublicAppUrl = (): string => {
  const raw = (process.env.APP_URL || '').trim();
  if (!raw) return DEFAULT_APP_URL;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_APP_URL;
  }
};

export default async function handler(req: any, res: any) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL
    ).trim();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secretKey) {
      return res.status(500).json({ success: false, error: 'STRIPE_SECRET_KEY manquante sur Vercel.' });
    }
    if (!supabaseServiceKey) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY manquante sur Vercel (Project Settings → API → service_role).',
      });
    }

    // Récupération sécurisée de l'utilisateur via le token d'autorisation
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Utilisateur non authentifié (token manquant).' });
    }

    const token = String(authHeader).replace('Bearer ', '').trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Session invalide ou expirée.' });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' } as any);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = body.action || 'create_account';

    // Compte Connect enregistré dans les métadonnées de l'utilisateur
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const currentMetadata = userData?.user?.user_metadata || {};
    let accountId = currentMetadata.stripe_connect_account_id;

    // ─── Statut du compte ────────────────────────────────────────────────────
    if (action === 'get_account_status') {
      if (!accountId || !accountId.startsWith('acct_')) {
        return res.status(200).json({
          success: true,
          hasAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        });
      }

      try {
        const account = await stripe.accounts.retrieve(accountId);
        return res.status(200).json({
          success: true,
          hasAccount: true,
          accountId,
          chargesEnabled: !!account.charges_enabled,
          payoutsEnabled: !!account.payouts_enabled,
          detailsSubmitted: !!account.details_submitted,
        });
      } catch (err: any) {
        // Compte supprimé ou rattaché à une autre plateforme : on nettoie la référence.
        if (err?.code === 'resource_missing' || err?.statusCode === 404) {
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: { ...currentMetadata, stripe_connect_account_id: null },
          });
          return res.status(200).json({
            success: true,
            hasAccount: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
          });
        }
        throw err;
      }
    }

    // ─── Lien vers le Dashboard Express ──────────────────────────────────────
    if (action === 'create_login_link') {
      if (!accountId || !accountId.startsWith('acct_')) {
        return res.status(400).json({
          success: false,
          error: "Aucun compte Stripe Connect n'est encore configuré. Lancez d'abord la configuration de vos paiements.",
        });
      }
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return res.status(200).json({ success: true, url: loginLink.url });
    }

    if (action !== 'create_account') {
      return res.status(400).json({ success: false, error: `Action Stripe Connect inconnue : « ${action} ».` });
    }

    // ─── Création du compte Express si absent ────────────────────────────────
    if (!accountId || !accountId.startsWith('acct_')) {
      const businessType = body.businessType === 'company' ? 'company' : 'individual';

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        business_type: businessType,
        ...(user.email ? { email: user.email } : {}),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          matik_user_id: user.id,
          source: 'matik_platform',
        },
      });
      accountId = account.id;

      const { error: saveError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...currentMetadata, stripe_connect_account_id: accountId },
      });

      if (saveError) {
        console.error('[Stripe Connect] Échec de sauvegarde du compte Connect :', saveError.message);
      }
    }

    // ─── Lien d'onboarding (création OU reprise) ─────────────────────────────
    const appUrl = getPublicAppUrl();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/?stripe_connect=refresh`,
      return_url: `${appUrl}/?stripe_connect=success`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ success: true, accountId, url: accountLink.url });
  } catch (err: any) {
    console.error('Erreur critique Stripe Connect :', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      statusCode: err?.statusCode,
    });

    // Les refus Stripe (Connect non activé, capabilities refusées…) sont exposés
    // en 502 avec le message exact : plus de 500 opaque impossible à diagnostiquer.
    if (typeof err?.type === 'string' && err.type.startsWith('Stripe')) {
      return res.status(502).json({
        success: false,
        error: err.message || 'Stripe a refusé la demande.',
        code: err.code || 'STRIPE_ERROR',
        type: err.type,
      });
    }

    return res.status(500).json({ success: false, error: err.message || 'Erreur interne du serveur' });
  }
}
