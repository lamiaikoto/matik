/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Stripe Connect Express API
 * ════════════════════════════════════════════════════════════════════════════
 * Gestion de l'onboarding Stripe Connect Express pour les loueurs (pro et particuliers).
 *
 * Fonctionnalités :
 *  - Création de compte Express lié au compte utilisateur Supabase
 *  - Génération de liens d'onboarding (account links)
 *  - Vérification du statut du compte (charges_enabled, payouts_enabled)
 *  - Génération de liens vers le Dashboard Express Stripe
 *
 * Variables d'environnement requises :
 *  - STRIPE_SECRET_KEY
 *  - SUPABASE_SERVICE_ROLE_KEY
 * ════════════════════════════════════════════════════════════════════════════
 */

import Stripe from 'stripe';
import {
  ApiError,
  applyCors,
  getSupabaseAdmin,
  requireUser,
  toErrorPayload,
  type RequestLike,
  type ResponseLike,
} from '../lib/bookingSecurity';

export default async function handler(req: RequestLike & { method?: string; body?: any }, res: ResponseLike): Promise<void> {
  const host = typeof req.headers?.host === 'string' ? req.headers.host : undefined;
  applyCors(req, res, host);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ success: false, error: 'Méthode non autorisée. Utilisez POST.' });
    return;
  }

  try {
    const user = await requireUser(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = String(body.action || 'create_account').trim();

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      throw new ApiError(
        503,
        'STRIPE_CONFIG_MISSING',
        "Le service Stripe n'est pas configuré sur le serveur (clé secrète manquante)."
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' } as any);
    const admin = getSupabaseAdmin();

    // 1. Récupération des métadonnées actuelles de l'utilisateur
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(user.id);
    if (userError || !userData?.user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable dans la base d’authentification.');
    }

    const currentMetadata = userData.user.user_metadata || {};
    let existingAccountId = currentMetadata.stripe_connect_account_id as string | undefined;

    // Détermination de l'URL racine de l'application
    const originHeader = req.headers?.origin || req.headers?.referer;
    let fallbackAppUrl = 'https://matikilou.com';
    if (originHeader) {
      try {
        const u = new URL(Array.isArray(originHeader) ? originHeader[0] : originHeader);
        fallbackAppUrl = `${u.protocol}//${u.host}`;
      } catch {}
    }
    const appUrl = (process.env.APP_URL || fallbackAppUrl).replace(/\/+$/, '');

    // ─── ACTION : Obtenir le statut du compte Connect ─────────────────────────
    if (action === 'get_account_status') {
      const targetAccountId = (body.accountId || existingAccountId || '').trim();

      if (!targetAccountId || !targetAccountId.startsWith('acct_')) {
        res.status(200).json({
          success: true,
          hasAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        });
        return;
      }

      try {
        const account = await stripe.accounts.retrieve(targetAccountId);
        res.status(200).json({
          success: true,
          hasAccount: true,
          accountId: targetAccountId,
          chargesEnabled: !!account.charges_enabled,
          payoutsEnabled: !!account.payouts_enabled,
          detailsSubmitted: !!account.details_submitted,
          country: account.country,
          email: account.email,
        });
        return;
      } catch (err: any) {
        console.warn(`⚠️ [Stripe Connect] Compte ${targetAccountId} introuvable chez Stripe :`, err?.message);
        res.status(200).json({
          success: true,
          hasAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        });
        return;
      }
    }

    // ─── ACTION : Accéder au Dashboard Stripe Express (Login link) ────────────
    if (action === 'create_login_link') {
      const targetAccountId = (body.accountId || existingAccountId || '').trim();
      if (!targetAccountId || !targetAccountId.startsWith('acct_')) {
        throw new ApiError(400, 'NO_CONNECT_ACCOUNT', "Aucun compte Stripe Connect associé à cet utilisateur.");
      }

      const loginLink = await stripe.accounts.createLoginLink(targetAccountId);
      res.status(200).json({
        success: true,
        url: loginLink.url,
      });
      return;
    }

    // ─── ACTION : Créer ou reprendre l'onboarding Connect (create_account / create_account_link) ──
    let accountId = existingAccountId;

    // Si l'utilisateur n'a pas encore de compte, ou si le compte enregistré est invalide
    if (!accountId || !accountId.startsWith('acct_')) {
      const businessType = body.businessType === 'company' || currentMetadata.role === 'loueur_pro'
        ? 'company'
        : 'individual';

      console.log(`🏦 [Stripe Connect] Création d'un compte Express (${businessType}) pour ${user.email} (${user.id})`);

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: businessType,
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          platform: 'matik',
        },
      });

      accountId = account.id;

      // Sauvegarde du compte dans les métadonnées de l'utilisateur Supabase
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...currentMetadata,
          stripe_connect_account_id: accountId,
        },
      });

      console.log(`✅ [Stripe Connect] Compte ${accountId} enregistré dans user_metadata pour ${user.id}`);
    }

    // Génération du lien d'onboarding Stripe Hosted
    const returnUrl = `${appUrl}/?stripe_connect=success`;
    const refreshUrl = `${appUrl}/?stripe_connect=refresh`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    res.status(200).json({
      success: true,
      accountId,
      url: accountLink.url,
    });
  } catch (error: any) {
    const { status, body: errorBody } = toErrorPayload(error);
    console.error('❌ [Stripe Connect API] Erreur :', error?.message || error);
    res.status(status).json(errorBody);
  }
}
