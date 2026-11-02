import React, { useState, useEffect } from 'react';
import { CurrentUser, LoueurProProfile, LoueurParticulierProfile, ClientProfile, UserRole } from '../types';
import { supabase, mapSupabaseUserToMatikProfile } from '../lib/supabase';
import {
  X,
  Building2,
  User,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  HeartHandshake,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: CurrentUser) => void;
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultRole = 'loueur_pro',
}) => {
  // Navigation entre l'écran social (Google / Apple) et le formulaire courriel
  const [authView, setAuthView] = useState<'social' | 'email'>('social');
  const [emailAuthMode, setEmailAuthMode] = useState<'login' | 'register'>('register');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'google' | 'apple' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [role, setRole] = useState<UserRole>(defaultRole);

  // Loueur Particulier Form state
  const [particulierPrenom, setParticulierPrenom] = useState('');
  const [particulierNom, setParticulierNom] = useState('');
  const [particulierEmail, setParticulierEmail] = useState('');
  const [particulierPhone, setParticulierPhone] = useState('');
  const [particulierCity, setParticulierCity] = useState('');

  // Loueur Pro Form state
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [loueurProName, setLoueurProName] = useState('');
  const [loueurProEmail, setLoueurProEmail] = useState('');
  const [loueurProPhone, setLoueurProPhone] = useState('');
  const [proCity, setProCity] = useState('');

  // Client Form state
  const [clientPrenom, setClientPrenom] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Mot de passe sécurisé pour l'authentification Supabase
  const [password, setPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialisation à partir de la session existante si disponible
  useEffect(() => {
    if (isOpen) {
      setAuthView('social');
      setIsSubmitting(false);
      setSocialProvider(null);
      setErrorMessage(null);
      setSuccessMessage(null);
      setPassword('');

      try {
        const saved = localStorage.getItem('matik_user_session') || localStorage.getItem('matik_user');
        if (saved) {
          const user = JSON.parse(saved);
          if (user.role === 'loueur_particulier') {
            setRole('loueur_particulier');
            setParticulierPrenom(user.prenom || '');
            setParticulierNom(user.nom || '');
            setParticulierEmail(user.email || '');
            setParticulierPhone(user.phone || '');
            setParticulierCity(user.city || '');
          } else if (user.role === 'loueur_pro') {
            setRole('loueur_pro');
            setCompanyName(user.companyName || '');
            setSiret(user.siret || '');
            setLoueurProName(user.name || '');
            setLoueurProEmail(user.email || '');
            setLoueurProPhone(user.phone || '');
            setProCity(user.city || '');
          } else if (user.role === 'client') {
            setRole('client');
            setClientPrenom(user.prenom || user.name?.split(' ')[0] || '');
            setClientNom(user.nom || user.name?.split(' ').slice(1).join(' ') || '');
            setClientEmail(user.email || '');
            setClientPhone(user.phone || '');
          }
        }
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Connexion OAuth réelle avec Google via Supabase Auth
   */
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setSocialProvider('google');
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('[Supabase Google Auth Error]', err);
      setErrorMessage(err.message || 'Impossible de se connecter avec Google. Veuillez réessayer.');
      setIsSubmitting(false);
      setSocialProvider(null);
    }
  };

  /**
   * Connexion OAuth réelle avec Apple via Supabase Auth
   */
  const handleAppleSignIn = async () => {
    setIsSubmitting(true);
    setSocialProvider('apple');
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('[Supabase Apple Auth Error]', err);
      setErrorMessage(err.message || 'Impossible de se connecter avec Apple. Veuillez réessayer.');
      setIsSubmitting(false);
      setSocialProvider(null);
    }
  };

  /**
   * Connexion ou Inscription sécurisée par Courriel & Mot de passe via Supabase Auth
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    let targetEmail = '';
    let prenom = '';
    let nom = '';
    let phone = '';
    let city = '';

    if (role === 'loueur_particulier') {
      targetEmail = particulierEmail.trim();
      prenom = particulierPrenom.trim();
      nom = particulierNom.trim();
      phone = particulierPhone.trim();
      city = particulierCity.trim();
    } else if (role === 'loueur_pro') {
      targetEmail = loueurProEmail.trim();
      prenom = loueurProName.trim();
      nom = companyName.trim();
      phone = loueurProPhone.trim();
      city = proCity.trim();
    } else {
      targetEmail = clientEmail.trim();
      prenom = clientPrenom.trim();
      nom = clientNom.trim();
      phone = clientPhone.trim();
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage('Une adresse e-mail valide est obligatoire.');
      setIsSubmitting(false);
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (emailAuthMode === 'login') {
        // --- 1. CONNEXION SUPABASE ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Adresse e-mail ou mot de passe incorrect.');
          }
          throw error;
        }

        if (data.user) {
          const profile = mapSupabaseUserToMatikProfile(data.user);
          try {
            localStorage.setItem('matik_user_session', JSON.stringify(profile));
            localStorage.setItem('matik_user', JSON.stringify(profile));
          } catch {}
          onLoginSuccess(profile);
          onClose();
        }
      } else {
        // --- 2. INSCRIPTION SUPABASE ---
        if (role === 'loueur_particulier') {
          if (!prenom || !nom) {
            setErrorMessage('Le prénom et le nom sont obligatoires.');
            setIsSubmitting(false);
            return;
          }
          if (!phone) {
            setErrorMessage('Le numéro de téléphone est obligatoire.');
            setIsSubmitting(false);
            return;
          }
        } else if (role === 'loueur_pro') {
          if (!companyName.trim()) {
            setErrorMessage('Le nom de l\'entreprise est obligatoire.');
            setIsSubmitting(false);
            return;
          }
          const cleanSiret = siret.replace(/\D/g, '');
          if (cleanSiret.length !== 14) {
            setErrorMessage('Le numéro SIRET doit comporter exactement 14 chiffres.');
            setIsSubmitting(false);
            return;
          }
        } else {
          if (!prenom || !nom) {
            setErrorMessage('Votre prénom et votre nom sont obligatoires.');
            setIsSubmitting(false);
            return;
          }
        }

        const { data, error } = await supabase.auth.signUp({
          email: targetEmail,
          password: password,
          options: {
            data: {
              role,
              prenom,
              nom,
              full_name: `${prenom} ${nom}`.trim(),
              phone,
              city,
              company_name: companyName.trim(),
              siret: siret.replace(/\D/g, ''),
            },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('Un compte existe déjà avec cette adresse e-mail. Connectez-vous.');
          }
          throw error;
        }

        if (data.session && data.user) {
          // Connexion directe si confirmation automatique activée
          const profile = mapSupabaseUserToMatikProfile(data.user);
          try {
            localStorage.setItem('matik_user_session', JSON.stringify(profile));
            localStorage.setItem('matik_user', JSON.stringify(profile));
          } catch {}
          onLoginSuccess(profile);
          onClose();
        } else if (data.user) {
          // Confirmation d'email requise par le projet Supabase
          setSuccessMessage(
            'Votre compte a été créé avec succès ! Si la confirmation par e-mail est requise, vérifiez votre boîte de réception pour activer votre accès.'
          );
          // On pré-crée le profil localement pour offrir une transition transparente
          const profile = mapSupabaseUserToMatikProfile(data.user);
          setTimeout(() => {
            onLoginSuccess(profile);
            onClose();
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('[Supabase Email Auth Error]', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de l\'authentification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* VUE 1 : ÉCRAN PRINCIPAL SOCIAL (GOOGLE & APPLE SUPABASE AUTH) */}
      {authView === 'social' && (
        <div className="relative w-full max-w-md bg-neutral-950 text-white border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-8 p-7 sm:p-9 space-y-7 animate-in fade-in zoom-in-95 duration-200">
          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Grand titre principal */}
          <div className="text-center space-y-2 pt-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Votre équipement<br />est à portée de clic.
            </h2>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Rejoignez Matik pour louer ou rentabiliser vos matériels en toute sécurité.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Boutons d'authentification réelle Google & Apple Supabase */}
          <div className="space-y-3.5">
            {/* Bouton Google OAuth Supabase */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-5 rounded-2xl bg-neutral-950 hover:bg-neutral-900 active:scale-[0.99] border border-neutral-700/80 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting && socialProvider === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continuer avec Google</span>
            </button>

            {/* Bouton Apple OAuth Supabase */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAppleSignIn}
              className="w-full py-3.5 px-5 rounded-2xl bg-neutral-950 hover:bg-neutral-900 active:scale-[0.99] border border-neutral-700/80 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting && socialProvider === 'apple' ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <svg className="w-5 h-5 shrink-0 fill-current text-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.55-8.49-10.02-18.06-13.4-28.71-3.38-10.66-5.07-20.91-5.07-30.76 0-13.81 3.4-25.26 10.2-34.35 6.8-9.09 15.34-13.72 25.62-13.9 4.36 0 9.27 1.15 14.73 3.47 5.46 2.32 9.24 3.53 11.35 3.63 1.9.11 5.92-1.16 12.06-3.81 6.14-2.65 11.51-3.86 16.11-3.63 12.87.63 23.01 5.43 30.43 14.4-11.44 6.9-17.05 16.42-16.84 28.56.22 9.54 3.82 17.5 10.8 23.88 4.23 3.89 9.06 6.78 14.49 8.67-2.33 6.98-5.08 14.16-8.24 21.53zm-32.99-109.1c0 6.64-2.52 12.98-7.56 19.02-6.32 7.42-14.07 11.75-22.61 11.75-.43 0-.85-.02-1.28-.05-1.07-.11-1.61-.21-1.61-.32 0-.21.05-.74.16-1.58.64-5.91 3.21-12.02 7.72-18.33 4.51-6.31 10.35-10.51 17.52-12.6 4.79-1.48 9.02-2.18 12.7-2.11.11 1.48.16 2.89.16 4.22z" />
                </svg>
              )}
              <span>Continuez avec Apple</span>
            </button>
          </div>

          {/* Section "Afficher les autres options" & "Continuer avec le courriel ->" */}
          <div className="text-center space-y-2 pt-1">
            <span className="text-xs text-neutral-400 block font-medium">Afficher les autres options</span>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setAuthView('email');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer group"
            >
              <span>Continuer avec le courriel</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Conditions d'utilisation */}
          <div className="pt-2 border-t border-neutral-900 text-center">
            <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xs mx-auto">
              En vous inscrivant, vous acceptez nos{' '}
              <span className="text-neutral-200 underline underline-offset-2">conditions d'utilisation</span> et notre{' '}
              <span className="text-neutral-200 underline underline-offset-2">politique de confidentialité</span>.
            </p>
          </div>
        </div>
      )}

      {/* VUE 2 : FORMULAIRE COURRIEL SUPABASE (CONNEXION & INSCRIPTION RÉELLES) */}
      {authView === 'email' && (
        <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAuthView('social')}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Retour à la connexion Google / Apple"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {emailAuthMode === 'register' ? 'Créer un compte Matik' : 'Connexion à votre compte'}
                </h3>
                <p className="text-xs text-slate-500">
                  {emailAuthMode === 'register' ? 'Authentification sécurisée Supabase' : 'Accédez à votre espace'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Connexion / Inscription */}
          <div className="px-6 pt-5 pb-1">
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setEmailAuthMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  emailAuthMode === 'register'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Inscription (Nouveau compte)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailAuthMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  emailAuthMode === 'login'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Connexion (Déjà inscrit)
              </button>
            </div>
          </div>

          {/* Rôle sélectionné uniquement en mode inscription */}
          {emailAuthMode === 'register' && (
            <div className="px-6 pt-3 pb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Type de compte souhaité
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 border border-slate-200/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('loueur_particulier')}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    role === 'loueur_particulier'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-center sm:text-left text-[11px]">Particulier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('loueur_pro')}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    role === 'loueur_pro'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-center sm:text-left text-[11px]">Pro SIRET</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    role === 'client'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-center sm:text-left text-[11px]">Client</span>
                </button>
              </div>
            </div>
          )}

          {/* Formulaire Principal */}
          <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Champs d'inscription spécifiques au rôle */}
            {emailAuthMode === 'register' && role === 'loueur_particulier' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Prénom <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={particulierPrenom}
                      onChange={(e) => setParticulierPrenom(e.target.value)}
                      placeholder="Alexandre"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nom <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={particulierNom}
                      onChange={(e) => setParticulierNom(e.target.value)}
                      placeholder="Martin"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Adresse e-mail <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={particulierEmail}
                    onChange={(e) => setParticulierEmail(e.target.value)}
                    placeholder="alexandre@domaine.fr"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mobile <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={particulierPhone}
                      onChange={(e) => setParticulierPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ville & CP
                    </label>
                    <input
                      type="text"
                      value={particulierCity}
                      onChange={(e) => setParticulierCity(e.target.value)}
                      placeholder="Lyon 3e"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {emailAuthMode === 'register' && role === 'loueur_pro' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Raison Sociale / Société <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Atelier BTP & Matériel Moreau"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      SIRET (14 chiffres) <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={14}
                      value={siret}
                      onChange={(e) => setSiret(e.target.value.replace(/\D/g, ''))}
                      placeholder="12345678900012"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ville du dépôt <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={proCity}
                      onChange={(e) => setProCity(e.target.value)}
                      placeholder="Bordeaux (33)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      E-mail professionnel <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={loueurProEmail}
                      onChange={(e) => setLoueurProEmail(e.target.value)}
                      placeholder="contact@moreau-btp.fr"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Téléphone <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={loueurProPhone}
                      onChange={(e) => setLoueurProPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {emailAuthMode === 'register' && role === 'client' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Prénom <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientPrenom}
                      onChange={(e) => setClientPrenom(e.target.value)}
                      placeholder="Alexandre"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nom <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientNom}
                      onChange={(e) => setClientNom(e.target.value)}
                      placeholder="Martin"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Adresse e-mail <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="alexandre@domaine.fr"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mobile <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* En mode connexion, un champ e-mail unique universel */}
            {emailAuthMode === 'login' && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Adresse e-mail de votre compte <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={particulierEmail || loueurProEmail || clientEmail}
                    onChange={(e) => {
                      setParticulierEmail(e.target.value);
                      setLoueurProEmail(e.target.value);
                      setClientEmail(e.target.value);
                    }}
                    placeholder="votre-adresse@domaine.fr"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Champ Mot de Passe Supabase Sécurisé */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mot de passe <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-md shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>
                      {emailAuthMode === 'login'
                        ? 'Se connecter avec Supabase'
                        : 'Créer mon compte sécurisé'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
