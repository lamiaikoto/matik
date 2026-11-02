import React from 'react';
import { Smartphone, Download, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenModal: () => void;
  variant?: 'nav' | 'banner' | 'footer' | 'pill';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenModal,
  variant = 'nav',
  className = '',
}) => {
  const { isInstalled, hasNativePrompt, installApp } = usePWAInstall();

  const handleClick = async () => {
    if (hasNativePrompt) {
      await installApp();
    } else {
      onOpenModal();
    }
  };

  if (isInstalled && variant === 'nav') {
    return (
      <div className={`hidden xl:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-emerald-700 text-xs font-medium ${className}`}>
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span>App installée</span>
      </div>
    );
  }

  if (variant === 'nav') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer group ${className}`}
        title="Télécharger l'application Matik sur votre appareil"
      >
        <Smartphone className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
        <span className="underline decoration-slate-300 underline-offset-4 group-hover:decoration-slate-500">Télécharger l&apos;application</span>
      </button>
    );
  }

  if (variant === 'banner') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-md shadow-amber-400/25 transition-all cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        <span>Télécharger l&apos;application Matik</span>
      </button>
    );
  }

  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={onOpenModal}
        className={`inline-flex items-center gap-2 text-slate-700 hover:text-amber-700 transition-colors cursor-pointer text-xs font-semibold ${className}`}
      >
        <Smartphone className="w-4 h-4 text-amber-600" />
        <span>Télécharger l&apos;app mobile (iOS &amp; Android)</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>Télécharger l&apos;application</span>
    </button>
  );
};
