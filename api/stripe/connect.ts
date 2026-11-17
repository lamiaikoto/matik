import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // CORS
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
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secretKey) {
      return res.status(500).json({ success: false, error: 'STRIPE_SECRET_KEY manquante sur Vercel.' });
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ success: false, error: 'Variables Supabase Admin manquantes sur Vercel.' });
    }

    // Récupération de l'utilisateur via le token Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Utilisateur non authentifié (token manquant).' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Session invalide ou expirée.' });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' } as any);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = body.action || 'create_account';

    // Récupération des métadonnées
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const currentMetadata = userData?.user?.user_metadata || {};
    let accountId = currentMetadata.stripe_connect_account_id;

    if (action === 'get_account_status') {
      if (!accountId || !accountId.startsWith('acct_')) {
        return res.status(200).json({ success: true, hasAccount: false });
      }
      const account = await stripe.accounts.retrieve(accountId);
      return res.status(200).json({
        success: true,
        hasAccount: true,
        accountId,
        chargesEnabled: !!account.charges_enabled,
        payoutsEnabled: !!account.payouts_enabled,
        detailsSubmitted: !!account.details_submitted,
      });
    }

    // Création du compte si absent
    if (!accountId || !accountId.startsWith('acct_')) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...currentMetadata, stripe_connect_account_id: accountId },
      });
    }

    const origin = req.headers.origin || 'https://matikilou.com';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?stripe_connect=refresh`,
      return_url: `${origin}/?stripe_connect=success`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ success: true, accountId, url: accountLink.url });

  } catch (err: any) {
    console.error('Erreur critique Stripe Connect :', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur interne du serveur' });
  }
}