import React, { useState } from 'react';
import { PageType, CurrentUser } from '../types';
import {
  Building2,
  User,
  ArrowRight,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Package,
  Home,
  Check,
  Smartphone,
  Plus,
} from 'lucide-react';
import { MatikLogo } from './MatikLogo';

interface NavbarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onOpenBooking: () => void;
  onOpenAuthModal: () => void;
  onOpenInstallModal: () => void;
  onOpenAddEquipment?: () => void;
  currentUser: CurrentUser;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenBooking,
  onOpenAuthModal,
  onOpenInstallModal,
  onOpenAddEquipment,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { id: PageType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'espace-loueur', label: 'Espace Loueur', icon: Building2 },
    { id: 'garanties', label: 'Garanties & Confiance', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8 h-20">
        {/* Zone 1: Nouveau Logo Matik Moderne avec icône stylisée et typo Inter */}
        <MatikLogo
          onClick={() => {
            onNavigate('accueil');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          size="md"
        />

        {/* Zone 2: Navigation tabs / multi-page links */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100/90 border border-slate-200 rounded-xl">
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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

        {/* Zone 3: Bouton Déposer une annonce + Connexion / Profil + CTA Réserver */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Bouton direct "Déposer une annonce" accessible à tout moment */}
          {onOpenAddEquipment && (
            <button
              type="button"
              onClick={onOpenAddEquipment}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0 group"
              title="Ajouter un article ou équipement à la location"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform stroke-[2.5]" />
              <span className="hidden sm:inline">Déposer une annonce</span>
              <span className="sm:hidden">Déposer</span>
            </button>
          )}

          {/* User auth state */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onNavigate('espace-loueur')}
                title="Accéder à votre espace"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                {currentUser.role === 'loueur_pro' ? (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span className="max-w-[130px] truncate font-bold">
                      {currentUser.companyName}
                    </span>
                  </>
                ) : currentUser.role === 'loueur_particulier' ? (
                  <>
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="max-w-[130px] truncate font-bold">
                      {currentUser.prenom} {currentUser.nom}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span className="max-w-[120px] truncate font-bold">
                      {currentUser.prenom ? `${currentUser.prenom} ${currentUser.nom || ''}`.trim() : currentUser.name}
                    </span>
                  </>
                )}
              </button>

              {/* Bouton Déconnexion propre */}
              <button
                type="button"
                onClick={onLogout}
                title="Déconnexion (changer de compte)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 text-xs font-bold text-slate-600 transition-all cursor-pointer group"
              >
                <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden lg:inline">Déconnexion</span>
              </button>
            </div>
          ) : (
            /* Connexion / Espace Loueur button */
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Connexion / Inscription</span>
              <span className="sm:hidden">Connexion</span>
            </button>
          )}

          {/* Yellow Reserver CTA button with enhanced prominence */}
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 rounded-xl shadow-sm shadow-amber-400/25 hover:shadow-md hover:shadow-amber-400/35 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Réserver</span>
            <ArrowRight className="w-4 h-4 shrink-0 stroke-[2.5]" />
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 md:hidden rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown navigation menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg">
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

          {/* Mobile direct add equipment button */}
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

          {/* Mobile Profile & Logout or Auth CTA */}
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
                      {currentUser.role === 'loueur_pro'
                        ? currentUser.companyName
                        : currentUser.role === 'loueur_particulier'
                        ? `${currentUser.prenom} ${currentUser.nom}`
                        : currentUser.prenom
                        ? `${currentUser.prenom} ${currentUser.nom || ''}`.trim()
                        : currentUser.name}
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
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>Connexion / Inscription</span>
              </button>
            )}
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
