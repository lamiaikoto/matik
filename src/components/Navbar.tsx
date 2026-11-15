import React, { useState, useEffect, useRef } from 'react';
import { PageType, CurrentUser } from '../types';
import {
  Building2,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Package,
  Home,
  Check,
  Smartphone,
  Plus,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { MatikLogo } from './MatikLogo';
import { LocaleSelector, LocaleSelectorMobile } from './LocaleSelector';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onOpenBooking?: () => void;
  onOpenAuthModal: () => void;
  onOpenInstallModal: () => void;
  onOpenAddEquipment?: () => void;
  currentUser: CurrentUser;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenAuthModal,
  onOpenInstallModal,
  onOpenAddEquipment,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { lang } = useLocale();

  // Fermer le menu déroulant profil au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const isLoueur = currentUser?.role === 'loueur_pro' || currentUser?.role === 'loueur_particulier';

  const navLinks: { id: PageType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'accueil', label: t('nav.home'), icon: Home },
    { id: 'catalogue', label: t('nav.catalogue'), icon: Package },
    { id: 'espace-loueur', label: isLoueur ? t('nav.myListings') : t('nav.loueurSpace'), icon: isLoueur ? Layers : Building2 },
    { id: 'garanties', label: t('nav.guarantees'), icon: ShieldCheck },
  ];

  // Extraction propre et sans espace résiduel du nom d'affichage
  const userDisplayName = (() => {
    if (!currentUser) return '';
    if (currentUser.role === 'loueur_pro') {
      return (currentUser.companyName || currentUser.name || '').trim();
    }
    if (currentUser.role === 'loueur_particulier') {
      const parts = [currentUser.prenom, currentUser.nom].filter(Boolean).join(' ').trim();
      return parts || (currentUser.name || '').trim();
    }
    const clientParts = [currentUser.prenom, currentUser.nom].filter(Boolean).join(' ').trim();
    return (
      clientParts ||
      (currentUser.name || '').trim() ||
      (currentUser.email?.split('@')[0] || '').trim() ||
      'Mon Compte'
    );
  })();

  // unused var suppressed
  void lang;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-16 sm:h-20">
        {/* Zone 1 (À gauche) : Logo Matik (toujours visible sur mobile et ordinateur) */}
        <div className="flex items-center shrink-0">
          <MatikLogo
            onClick={() => {
              onNavigate('accueil');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            size="md"
          />
        </div>

        {/* Zone 2 (Au centre) : Liens principaux visibles sur ordinateur (lg:flex) */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100/90 border border-slate-200 rounded-xl">
          {navLinks.map((tab) => {
            const isActive = currentPage === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onNavigate(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'espace-loueur' && (currentUser?.role === 'loueur_pro' || currentUser?.role === 'loueur_particulier') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3 (À droite) : Bouton + Déposer une annonce, Badge Profil (lamia ▾) avec menu déroulant, Menu burger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Bouton compact "Déposer une annonce" */}
          {onOpenAddEquipment && (
            <button
              type="button"
              onClick={onOpenAddEquipment}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0 group"
              title="Ajouter un article ou équipement à la location"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform stroke-[2.5]" />
              <span className="hidden md:inline">{t('nav.listItem')}</span>
              <span className="md:hidden">+</span>
            </button>
          )}

          {/* Sélecteur Langue & Devise (desktop) */}
          <div className="hidden md:block shrink-0">
            <LocaleSelector compact />
          </div>

          {/* Badge Profil (lamia ▾) avec menu déroulant vertical au clic */}
          {currentUser ? (
            <div ref={userMenuRef} className="relative inline-block text-left shrink-0">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="w-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer shrink-0"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                title="Menu du compte utilisateur"
              >
                {currentUser.role === 'loueur_pro' ? (
                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : currentUser.role === 'loueur_particulier' ? (
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                )}
                <span className="w-auto max-w-[120px] truncate font-bold text-slate-900">
                  {userDisplayName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    userMenuOpen ? 'rotate-180 text-amber-600' : ''
                  }`}
                />
              </button>

              {/* Menu déroulant vertical au clic sur le badge profil */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-slate-950 truncate">
                        {userDisplayName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 uppercase shrink-0">
                        {currentUser.role === 'loueur_pro'
                          ? 'Pro'
                          : currentUser.role === 'loueur_particulier'
                          ? 'Particulier'
                          : 'Client'}
                      </span>
                    </div>
                    {currentUser.email && (
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate('espace-loueur');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{t('nav.myAnnouncements')}</span>
                    </button>

                    {onOpenAddEquipment && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenAddEquipment();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                      >
                        <Plus className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{t('nav.listItem')}</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Bouton Connexion / Inscription */
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">{t('nav.loginSignup')}</span>
              <span className="sm:hidden">{t('nav.login')}</span>
            </button>
          )}

          {/* Bouton Menu burger sur mobile/tablette (lg:hidden) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 lg:hidden rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shrink-0"
            aria-label="Menu de navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu déroulant responsive mobile/tablette (< 1024px / lg:hidden) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {navLinks.map((tab) => {
            const isActive = currentPage === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onNavigate(tab.id);
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {isActive && <Check className="w-4 h-4" />}
              </button>
            );
          })}

          {/* Bouton direct déposer annonce dans le menu mobile */}
          {onOpenAddEquipment && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAddEquipment();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Déposer une annonce</span>
              </button>
            </div>
          )}

          {/* Profil et Déconnexion dans le menu mobile */}
          <div className="pt-2 border-t border-slate-100">
            {currentUser ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {currentUser.role === 'loueur_pro' ? (
                      <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {userDisplayName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 uppercase shrink-0">
                    {currentUser.role === 'loueur_pro'
                      ? 'Loueur Pro'
                      : currentUser.role === 'loueur_particulier'
                      ? 'Particulier'
                      : 'Client'}
                  </span>
                </div>
                {currentUser.email && (
                  <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('espace-loueur');
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs mt-1"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-950" />
                  <span>Accéder à Mes Annonces</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200 transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion (changer de compte)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuthModal();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Connexion / Inscription</span>
              </button>
            )}
          </div>

          {/* Sélecteur de Langue & Devise sur mobile / tablette */}
          <div className="pt-2 border-t border-slate-100">
            <LocaleSelectorMobile />
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenInstallModal();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>Télécharger l&apos;application Matik</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded">
                App
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
