import React from 'react';
import { Smartphone, Download, ShieldCheck, Zap, Bell, CheckCircle2, Apple } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface AppDownloadBannerProps {
  onOpenInstallModal: () => void;
}

export const AppDownloadBanner: React.FC<AppDownloadBannerProps> = ({ onOpenInstallModal }) => {
  return (
    <section className="py-14 sm:py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-8 sm:p-12 lg:p-16 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-10">
          {/* Left Column: Copy & CTAs */}
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Application Officielle Matik</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-slate-300 font-normal">iOS & Android</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Emportez Matik partout : téléchargez l'application
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Installez l'application en un clic sur votre smartphone ou votre ordinateur.
              Générez vos contrats certifiés, gérez vos cautions Stripe sans débit et suivez vos réservations en temps réel, même sur chantier ou à l'atelier sans connexion.
            </p>

            {/* Feature Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Installation directe en 2 secondes</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Notifications instantanées Stripe</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Contrats accessibles 100% hors-ligne</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Aucun intermédiaire, mise à jour auto</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <PWAInstallButton onOpenModal={onOpenInstallModal} variant="banner" />
              <button
                type="button"
                onClick={onOpenInstallModal}
                className="px-5 py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors text-center cursor-pointer"
              >
                Guide d'installation iOS / Android
              </button>
            </div>
          </div>

          {/* Right Column: Visual Smartphone Mockup */}
          <div className="w-full max-w-xs shrink-0 lg:max-w-sm">
            <div className="relative mx-auto rounded-[2.5rem] bg-slate-950 p-4 border-4 border-slate-700 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full" />

              {/* App Screen Content */}
              <div className="rounded-[1.75rem] bg-slate-900 border border-slate-800 p-5 pt-8 text-white space-y-4 font-sans">
                {/* Header inside mock */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                      M
                    </div>
                    <span className="font-extrabold text-sm text-white">Matik App</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    En ligne
                  </span>
                </div>

                {/* Card 1: Active rental preview */}
                <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Dernière réservation</span>
                    <span className="text-amber-400 font-mono font-bold">Actif</span>
                  </div>
                  <div className="text-xs font-bold text-white">Pack Enceintes & Caisson JBL</div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700 text-slate-300">
                    <span>Caution Stripe</span>
                    <span className="text-emerald-400 font-mono font-bold">500 € sous séquestre</span>
                  </div>
                </div>

                {/* Card 2: Quick action */}
                <div className="p-3.5 rounded-xl bg-amber-400 text-slate-950 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wide">Contrat certifié</div>
                  <div className="text-xs font-black">Prêt pour signature numérique</div>
                  <div className="text-[10px] text-slate-800">Empreinte bancaire validée sans débit</div>
                </div>

                {/* Mock bottom bar */}
                <div className="pt-2 flex justify-around text-[10px] text-slate-400 border-t border-slate-800">
                  <span className="text-amber-400 font-semibold">Accueil</span>
                  <span>Catalogue</span>
                  <span>Loueur</span>
                  <span>Contrats</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
