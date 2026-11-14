/**
 * LocaleSelector — Sélecteur de Langue & Devise pour la Navbar Matik
 * Compact dropdown qui permet de basculer entre FR/EN et EUR/USD
 * Mémorise le choix dans localStorage.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { SupportedLang, SupportedCurrency } from '../i18n';

interface LocaleSelectorProps {
  compact?: boolean; // mode compact pour la navbar desktop
}

export const LocaleSelector: React.FC<LocaleSelectorProps> = ({ compact = false }) => {
  const { lang, currency, setLang, setCurrency, currencySymbols } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const languages: { code: SupportedLang; flag: string; label: string }[] = [
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
  ];

  const currencies: { code: SupportedCurrency; label: string }[] = [
    { code: 'EUR', label: 'EUR €' },
    { code: 'USD', label: 'USD $' },
  ];

  const currentLang = languages.find((l) => l.code === lang) || languages[0];
  const currentCurrencySymbol = currencySymbols[currency];

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        }`}
        title="Langue & Devise"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="hidden sm:inline">{currentLang.flag}</span>
        <span className="hidden lg:inline text-slate-600">{currentLang.code.toUpperCase()}</span>
        <span className="text-amber-700 font-bold">{currentCurrencySymbol}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
          role="listbox"
        >
          {/* Language section */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              Langue / Language
            </p>
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={lang === l.code}
                onClick={() => {
                  setLang(l.code);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer mb-0.5 ${
                  lang === l.code
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </span>
                {lang === l.code && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 mx-3 my-1" />

          {/* Currency section */}
          <div className="px-3 pb-3 pt-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Devise / Currency
            </p>
            {currencies.map((c) => (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={currency === c.code}
                onClick={() => {
                  setCurrency(c.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer mb-0.5 ${
                  currency === c.code
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{c.label}</span>
                {currency === c.code && <Check className="w-3.5 h-3.5 text-slate-950" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Version inline pour le menu mobile — pas de dropdown, juste les boutons en ligne
 */
export const LocaleSelectorMobile: React.FC = () => {
  const { lang, currency, setLang, setCurrency, currencySymbols } = useLocale();

  const languages: { code: SupportedLang; flag: string; label: string }[] = [
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
  ];

  const currencies: { code: SupportedCurrency; label: string }[] = [
    { code: 'EUR', label: `EUR ${currencySymbols.EUR}` },
    { code: 'USD', label: `USD ${currencySymbols.USD}` },
  ];

  return (
    <div className="pt-2 space-y-2">
      {/* Language row */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5 px-1">
          <Globe className="w-3 h-3" />
          Langue / Language
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                lang === l.code
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <Check className="w-3 h-3 text-amber-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Currency row */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
          Devise / Currency
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {currencies.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currency === c.code
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{c.label}</span>
              {currency === c.code && <Check className="w-3 h-3 text-slate-950" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
