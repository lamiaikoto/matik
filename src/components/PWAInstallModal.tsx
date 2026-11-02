import React from 'react';
import {
  X,
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  ShieldCheck,
  Zap,
  BellRing,
  FileCheck2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, installApp, hasNativePrompt } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      await installApp();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 pb-4 flex items-start justify-between border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-md shadow-slate-900/10 font-black text-2xl border border-slate-800">
              M
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Application Matik
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                  PWA Mobile & Desktop
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Location de matériel · Caution Stripe sécurisée
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

        {/* Modal Content */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Status banner if already installed */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="block font-bold">Matik est déjà installée sur cet appareil !</strong>
                Retrouvez l'application directement sur votre écran d'accueil ou votre lanceur d'applications.
              </div>
            </div>
          ) : (
            <>
              {/* Value Proposition bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Accès ultra-rapide</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Ouverture en 1 clic depuis votre écran d'accueil, sans chargement de navigateur.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <BellRing className="w-4 h-4 text-amber-600" />
                    <span>Alertes en temps réel</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Suivi instantané des cautions Stripe et confirmations de restitution de matériel.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <FileCheck2 className="w-4 h-4 text-amber-600" />
                    <span>Contrats hors-ligne</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Consultez vos attestations et attestations de caution même sans réseau à l'atelier.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Sécurisé & Garanti</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Chiffrement bancaire Stripe certifié et conformité contractuelle automatique.
                  </p>
                </div>
              </div>

              {/* Native Prompt Button (Chromium, Android, Desktop) */}
              {hasNativePrompt ? (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-4 px-6 rounded-2xl text-sm font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-md shadow-amber-400/25 flex items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span>Installer l'application sur cet appareil</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-500">
                    Installation certifiée PWA · Aucun téléchargement lourd · Moins de 2 Mo
                  </p>
                </div>
              ) : isIOS ? (
                /* iOS Safari instructions */
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-950 text-xs">
                    <Smartphone className="w-4 h-4 text-amber-700" />
                    <span>Comment installer sur iPhone & iPad (Safari) :</span>
                  </div>
                  <ol className="text-xs text-slate-700 space-y-2.5 pl-1">
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-bold text-[11px]">
                        1
                      </span>
                      <span>
                        Appuyez sur l'icône <strong className="text-slate-900 font-semibold">Partager</strong>{' '}
                        <Share className="inline w-3.5 h-3.5 text-blue-600 mx-1 align-baseline" /> dans la barre de Safari.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-bold text-[11px]">
                        2
                      </span>
                      <span>
                        Faites défiler vers le bas et sélectionnez{' '}
                        <strong className="text-slate-900 font-semibold">« Sur l'écran d'accueil »</strong>{' '}
                        <PlusSquare className="inline w-3.5 h-3.5 text-slate-700 mx-1 align-baseline" />.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-bold text-[11px]">
                        3
                      </span>
                      <span>
                        Appuyez sur <strong className="text-slate-900 font-semibold">« Ajouter »</strong> en haut à droite. L'icône Matik s'affichera directement sur votre écran !
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                /* Generic Android / Desktop instructions when prompt was already dismissed */
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-950 text-xs">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <span>Installation directe :</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sur Android ou ordinateur (Chrome, Edge) : cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur ou dans le menu des options (trois petits points) puis choisissez <strong>« Installer Matik »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Matik PWA v1.0.4</span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-700 hover:text-slate-950 font-semibold cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
