import React from 'react';

interface MatikLogoProps {
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const MatikLogo: React.FC<MatikLogoProps> = ({
  onClick,
  className = '',
  size = 'md',
  showTagline = false,
}) => {
  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-11 h-11 sm:w-12 sm:h-12',
  }[size];

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  }[size];

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <a
      href="/"
      onClick={handleClick}
      aria-label="Accueil Matik - Location de matériel avec caution sécurisée"
      className={`inline-flex items-center gap-2.5 group cursor-pointer select-none text-left no-underline ${className}`}
    >
      {/* Badge Stylisé : Forme moderne avec lettre M sculptée, biseau de garantie et clé d'outillage */}
      <div
        className={`relative ${iconSizeClasses} rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/35 group-hover:scale-105 transition-all duration-200 shrink-0 flex items-center justify-center`}
      >
        {/* Anneau intérieur subtil */}
        <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center relative overflow-hidden">
          {/* Reflet lumineux d'angle */}
          <div className="absolute -top-3 -right-3 w-7 h-7 bg-white/30 rounded-full blur-xs pointer-events-none" />

          {/* Icône SVG moderne : M architectural avec encoche clé de garantie */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 fill-current drop-shadow-2xs transition-transform duration-200 group-hover:scale-105"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Lettre M stylisée avec profil industriel & biseau central */}
            <path
              d="M4 20V5.5C4 4.67 4.67 4 5.5 4H7.2C7.9 4 8.5 4.38 8.8 5L12 10.2L15.2 5C15.5 4.38 16.1 4 16.8 4H18.5C19.33 4 20 4.67 20 5.5V20H16.8V11.2L13.2 16.7C12.8 17.3 11.2 17.3 10.8 16.7L7.2 11.2V20H4Z"
              fill="#090D16"
            />
            {/* Clé d'outillage / Micro-écrou de certification central */}
            <circle cx="12" cy="7.2" r="1.1" fill="#FDE68A" />
          </svg>
        </div>
      </div>

      {/* Typographie INTER en gras */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline">
          <span
            style={{ fontFamily: "'Inter', sans-serif" }}
            className={`font-black tracking-tight text-slate-950 group-hover:text-amber-600 transition-colors duration-150 ${textSizeClasses}`}
          >
            Matik
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase -mt-1 hidden sm:block">
            Location & Caution Stripe
          </span>
        )}
      </div>
    </a>
  );
};
