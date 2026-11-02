import { createClient } from '@supabase/supabase-js';
import { CurrentUser, LoueurProProfile, LoueurParticulierProfile, ClientProfile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://inozsbkfcbkwlrozdvjj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Wk05Skx2hP-oq7BRKLXdSw_YnzHeLbe';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Clés de configuration manquantes ou incomplètes dans le fichier .env');
}

/**
 * Client Supabase officiel pour l'authentification et la base de données
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

/**
 * Transforme un utilisateur authentifié Supabase (avec ses metadata) en profil Matik (CurrentUser)
 */
export const mapSupabaseUserToMatikProfile = (user: any): CurrentUser => {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const email = user.email || metadata.email || '';
  const role = metadata.role || 'client'; // 'loueur_pro' | 'loueur_particulier' | 'client'

  const prenom = metadata.prenom || metadata.given_name || (metadata.full_name ? metadata.full_name.split(' ')[0] : '') || '';
  const nom = metadata.nom || metadata.family_name || (metadata.full_name ? metadata.full_name.split(' ').slice(1).join(' ') : '') || '';
  const fullName = (metadata.full_name || `${prenom} ${nom}`.trim() || email.split('@')[0]) || 'Utilisateur Matik';
  const phone = metadata.phone || user.phone || '';
  const city = metadata.city || 'France';

  if (role === 'loueur_pro') {
    const profile: LoueurProProfile = {
      id: user.id,
      role: 'loueur_pro',
      name: fullName,
      prenom: prenom || fullName,
      nom: nom,
      companyName: metadata.company_name || metadata.companyName || fullName,
      siret: metadata.siret || '89123456700012',
      email,
      phone,
      city,
    };
    return profile;
  }

  if (role === 'loueur_particulier') {
    const profile: LoueurParticulierProfile = {
      id: user.id,
      role: 'loueur_particulier',
      prenom: prenom || fullName,
      nom: nom,
      name: fullName,
      email,
      phone,
      city,
    };
    return profile;
  }

  // Rôle par défaut : Client / Emprunteur
  const clientProfile: ClientProfile = {
    id: user.id,
    role: 'client',
    prenom: prenom || fullName,
    nom: nom,
    name: fullName,
    email,
    phone,
    city,
  };

  return clientProfile;
};
