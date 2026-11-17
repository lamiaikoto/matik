import Stripe from 'stripe';
import {
  ApiError,
  applyCors,
  getSupabaseAdmin,
  requireUser,
  toErrorPayload,
} from '../lib/bookingSecurity';

/**
 * Route serveur Stripe Connect Express.
 *
 * Actions acceptées (POST JSON) :
 *   - create_account     : crée le compte Express si besoin puis renvoie un lien d'onboarding
 *   - get_account_status : renvoie l'état du compte (paiements, versements, dossier)
 *   - create_login_link  : renvoie un lien d'accès au Dashboard Express du loueur
 *
 * Toutes les erreurs sont renvoyées en JSON avec un code HTTP explicite :
 * plus jamais un 500 opaque sans message exploitable côté front.
 */

const STRIPE_API_VERSION = '2024-11-20.acacia';
const DEFAULT_PUBLIC_URL = 'https://matikilou.com';

const isValidAccountId = (value?: string | null): value is string =>
  !!value && /^acct_[A-Za-z0-9]+$/.test(value);

const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new ApiError(
      503,
      'STRIPE_NOT_CONFIGURED',
      "Le paiement en ligne n'est pas configuré : la variable STRIPE_SECRET_KEY est absente sur Vercel."
    );
  }
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION } as any);
};

/** URL publique de l'application (jamais l'en-tête Origin, pour éviter un open redirect). */
const getPublicAppUrl = (): string => {
  const raw = (process.env.APP_URL || '').trim();
  if (!raw) return DEFAULT_PUBLIC_URL;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_PUBLIC_URL;
  }
};

const parseBody = (rawBody: unknown): Record<string, any> => {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    if (!rawBody.trim()) return {};
    try {
      return JSON.parse(rawBody);
    } catch {
      throw new ApiError(400, 'INVALID_BODY', 'Le corps de la requête doit être un JSON valide.');
    }
  }
  if (typeof rawBody === 'object') return rawBody as Record<string, any>;
  return {};
};

/** Réponse standard « pas encore de compte Connect ». */
const noAccountResponse = () => ({
  success: true,
  hasAccount: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
});

/**
 * Vérifie que le compte Connect appartient bien à l'utilisateur authentifié.
 * L'identifiant est stocké dans les métadonnées Supabase (modifiables par le titulaire) :
 * sans ce contrôle, un utilisateur pourrait rattacher le compte Stripe d'un autre loueur
 * puis ouvrir son Dashboard Express.
 */
const retrieveOwnedAccount = async (
  stripe: Stripe,
  accountId: string,
  userId: string,
  userEmail: string
): Promise<Stripe.Account> => {
  const account = await stripe.accounts.retrieve(accountId);
  const ownerId = account.metadata?.matik_user_id;

  if (ownerId) {
    if (ownerId !== userId) {
      throw new ApiError(
        403,
        'CONNECT_ACCOUNT_FORBIDDEN',
        "Ce compte Stripe Connect n'est pas rattaché à votre profil."
      );
    }
    return account;
  }

  // Comptes créés avant l'ajout du marqueur : on vérifie l'e-mail, puis on pose le marqueur.
  const accountEmail = (account.email || '').trim().toLowerCase();
  if (!accountEmail || accountEmail !== userEmail.trim().toLowerCase()) {
    throw new ApiError(
      403,
      'CONNECT_ACCOUNT_FORBIDDEN',
      "Ce compte Stripe Connect n'est pas rattaché à votre profil."
    );
  }

  try {
    return await stripe.accounts.update(accountId, {
      metadata: { ...account.metadata, matik_user_id: userId },
    });
  } catch {
    return account;
  }
};

export default async function handler(req: any, res: any) {
  const host = typeof req.headers?.host === 'string' ? req.headers.host : undefined;
  applyCors(req, res, host);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ success: false, error: 'Seules les requêtes POST sont autorisées.' });
    return;
  }

  try {
    // 1. Authentification : JWT Supabase obligatoire (401 explicite si absent/expiré).
    const user = await requireUser(req);

    // 2. Configuration Stripe (503 explicite si la clé secrète manque).
    const stripe = getStripe();
    const admin = getSupabaseAdmin();

    const body = parseBody(req.body);
    const action = typeof body.action === 'string' && body.action ? body.action : 'create_account';

    // 3. Compte Stripe Connect déjà enregistré dans les métadonnées Supabase ?
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(user.id);
    if (userError || !userData?.user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Compte utilisateur introuvable.');
    }

    const metadata = userData.user.user_metadata || {};
    let accountId: string =
      typeof metadata.stripe_connect_account_id === 'string'
        ? metadata.stripe_connect_account_id.trim()
        : '';

    /** Efface un identifiant de compte devenu invalide côté Stripe (compte supprimé, autre plateforme…). */
    const forgetAccount = async () => {
      if (!accountId) return;
      accountId = '';
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...metadata, stripe_connect_account_id: null },
      });
      if (error) {
        console.error('[Stripe Connect] Impossible de nettoyer stripe_connect_account_id :', error.message);
      }
    };

    // ─── Statut du compte ────────────────────────────────────────────────────
    if (action === 'get_account_status') {
      if (!isValidAccountId(accountId)) {
        res.status(200).json(noAccountResponse());
        return;
      }

      let account: Stripe.Account;
      try {
        account = await retrieveOwnedAccount(stripe, accountId, user.id, user.email);
      } catch (err: any) {
        if (err?.code === 'resource_missing' || err?.statusCode === 404) {
          await forgetAccount();
          res.status(200).json(noAccountResponse());
          return;
        }
        throw err;
      }

      res.status(200).json({
        success: true,
        hasAccount: true,
        accountId,
        chargesEnabled: !!account.charges_enabled,
        payoutsEnabled: !!account.payouts_enabled,
        detailsSubmitted: !!account.details_submitted,
      });
      return;
    }

    // ─── Lien vers le Dashboard Express ──────────────────────────────────────
    if (action === 'create_login_link') {
      if (!isValidAccountId(accountId)) {
        throw new ApiError(
          400,
          'NO_CONNECT_ACCOUNT',
          "Aucun compte Stripe Connect n'est encore configuré. Lancez d'abord « Configurer mes paiements »."
        );
      }

      try {
        await retrieveOwnedAccount(stripe, accountId, user.id, user.email);
      } catch (err: any) {
        if (err?.code === 'resource_missing' || err?.statusCode === 404) {
          await forgetAccount();
          throw new ApiError(
            400,
            'NO_CONNECT_ACCOUNT',
            "Votre compte Stripe Connect est introuvable. Relancez la configuration de vos paiements."
          );
        }
        throw err;
      }

      const loginLink = await stripe.accounts.createLoginLink(accountId);
      res.status(200).json({ success: true, url: loginLink.url });
      return;
    }

    if (action !== 'create_account') {
      throw new ApiError(400, 'UNKNOWN_ACTION', `Action Stripe Connect inconnue : « ${action} ».`);
    }

    // ─── Création du compte Express si nécessaire ────────────────────────────
    if (!isValidAccountId(accountId)) {
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

      const { error: saveError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...metadata, stripe_connect_account_id: accountId },
      });

      // On continue quand même : l'ID est renvoyé au client et sera réessayé au prochain appel.
      if (saveError) {
        console.error('[Stripe Connect] Échec de sauvegarde du compte Connect :', saveError.message);
      }
    }

    // ─── Lien d'onboarding (création OU reprise) ─────────────────────────────
    // Contrôle d'appartenance : empêche de générer un lien d'onboarding pour le compte d'un tiers.
    try {
      await retrieveOwnedAccount(stripe, accountId, user.id, user.email);
    } catch (err: any) {
      if (err?.code === 'resource_missing' || err?.statusCode === 404) {
        await forgetAccount();
        throw new ApiError(
          400,
          'NO_CONNECT_ACCOUNT',
          "Votre compte Stripe Connect est introuvable. Relancez la configuration de vos paiements."
        );
      }
      throw err;
    }

    const appUrl = getPublicAppUrl();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/?stripe_connect=refresh`,
      return_url: `${appUrl}/?stripe_connect=success`,
      type: 'account_onboarding',
    });

    res.status(200).json({ success: true, accountId, url: accountLink.url });
  } catch (err: any) {
    console.error('[Stripe Connect] Erreur :', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      statusCode: err?.statusCode,
    });

    // Les erreurs métier renvoyées par Stripe ne sont pas des 500 de l'application :
    // on les expose en 502 avec le message exact pour permettre la correction côté compte Stripe.
    if (typeof err?.type === 'string' && err.type.startsWith('Stripe')) {
      res.status(502).json({
        success: false,
        error: err.message || 'Stripe a refusé la demande.',
        code: err.code || 'STRIPE_ERROR',
        type: err.type,
      });
      return;
    }

    const { status, body: payload } = toErrorPayload(err);
    res.status(status).json(payload);
  }
}
