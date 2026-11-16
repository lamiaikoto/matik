import { supabase } from './supabase';

export interface StripeConnectStatusResponse {
  success: boolean;
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  error?: string;
}

export interface StripeConnectOnboardingResponse {
  success: boolean;
  accountId?: string;
  url?: string;
  error?: string;
}

export interface StripeConnectLoginLinkResponse {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Récupère le jeton JWT Supabase pour les requêtes authentifiées.
 */
async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

/**
 * Interroge le statut du compte Stripe Connect de l'utilisateur connecté.
 */
export async function getStripeConnectStatus(accountId?: string): Promise<StripeConnectStatusResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        hasAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        error: 'Utilisateur non authentifié',
      };
    }

    const res = await fetch('/api/stripe/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'get_account_status',
        accountId,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        hasAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        error: errData.error || `Erreur serveur (${res.status})`,
      };
    }

    return await res.json();
  } catch (err: any) {
    console.warn('⚠️ [Stripe Connect] Erreur lors de la récupération du statut :', err?.message || err);
    return {
      success: false,
      hasAccount: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      error: err?.message || 'Erreur réseau',
    };
  }
}

/**
 * Initialise ou reprend l'onboarding Stripe Connect Express (génère l'URL d'inscription).
 */
export async function startStripeConnectOnboarding(
  businessType: 'company' | 'individual' = 'individual'
): Promise<StripeConnectOnboardingResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: 'Connectez-vous avant de configurer vos paiements Stripe.',
      };
    }

    const res = await fetch('/api/stripe/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'create_account',
        businessType,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Impossible d'initialiser Stripe Connect (${res.status}).`,
      };
    }

    return data;
  } catch (err: any) {
    console.error('❌ [Stripe Connect] Erreur onboarding :', err);
    return {
      success: false,
      error: err?.message || 'Erreur réseau lors de la connexion à Stripe.',
    };
  }
}

/**
 * Génère un lien de connexion direct vers le Dashboard Stripe Express du loueur.
 */
export async function getStripeConnectDashboardLink(accountId?: string): Promise<StripeConnectLoginLinkResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: 'Utilisateur non authentifié.',
      };
    }

    const res = await fetch('/api/stripe/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'create_login_link',
        accountId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Impossible d'ouvrir le Dashboard Stripe (${res.status}).`,
      };
    }

    return data;
  } catch (err: any) {
    console.error('❌ [Stripe Connect] Erreur Dashboard link :', err);
    return {
      success: false,
      error: err?.message || 'Erreur réseau',
    };
  }
}
