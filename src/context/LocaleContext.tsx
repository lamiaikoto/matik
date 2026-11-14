/**
 * LocaleContext — Contexte React pour langue + devise
 * Permet à n'importe quel composant de lire/changer la langue et la devise
 * sans prop drilling.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import i18n, {
  SupportedLang,
  SupportedCurrency,
  SUPPORTED_LANGUAGES,
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  EXCHANGE_RATES,
  formatPrice,
} from '../i18n';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LocaleContextValue {
  lang: SupportedLang;
  currency: SupportedCurrency;
  currencySymbol: string;
  setLang: (lang: SupportedLang) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  formatPrice: (amountEur: number) => string;
  supportedLangs: readonly SupportedLang[];
  supportedCurrencies: readonly SupportedCurrency[];
  currencySymbols: Record<SupportedCurrency, string>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLang>(() => {
    try {
      const saved = localStorage.getItem('matik_lang');
      if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLang)) {
        return saved as SupportedLang;
      }
    } catch {}
    // Détection depuis le navigateur
    const browserLang = navigator.language?.split('-')[0];
    return SUPPORTED_LANGUAGES.includes(browserLang as SupportedLang)
      ? (browserLang as SupportedLang)
      : 'fr';
  });

  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    try {
      const saved = localStorage.getItem('matik_currency');
      if (saved && SUPPORTED_CURRENCIES.includes(saved as SupportedCurrency)) {
        return saved as SupportedCurrency;
      }
    } catch {}
    return 'EUR';
  });

  // Synchroniser i18next quand la langue change
  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  const setLang = useCallback((newLang: SupportedLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('matik_lang', newLang);
    } catch {}
    i18n.changeLanguage(newLang);
  }, []);

  const setCurrency = useCallback((newCurrency: SupportedCurrency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem('matik_currency', newCurrency);
    } catch {}
  }, []);

  const formatPriceFn = useCallback(
    (amountEur: number) => formatPrice(amountEur, currency, lang),
    [currency, lang]
  );

  return (
    <LocaleContext.Provider
      value={{
        lang,
        currency,
        currencySymbol: CURRENCY_SYMBOLS[currency],
        setLang,
        setCurrency,
        formatPrice: formatPriceFn,
        supportedLangs: SUPPORTED_LANGUAGES,
        supportedCurrencies: SUPPORTED_CURRENCIES,
        currencySymbols: CURRENCY_SYMBOLS,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useLocale = (): LocaleContextValue => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used inside <LocaleProvider>');
  }
  return ctx;
};

// Re-export useful helpers
export { EXCHANGE_RATES, formatPrice };
