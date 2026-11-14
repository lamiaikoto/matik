/**
 * Configuration i18next pour Matik
 * Supporte : Français (fr) | Anglais (en)
 * Détection automatique depuis le navigateur puis localStorage
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGUAGES)[number];

export const SUPPORTED_CURRENCIES = ['EUR', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: '€',
  USD: '$',
};

/** Taux de conversion approximatifs (EUR comme base) — à remplacer par une API live si nécessaire */
export const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  EUR: 1,
  USD: 1.09,
};

/**
 * Formate un montant dans la devise sélectionnée
 */
export function formatPrice(amountEur: number, currency: SupportedCurrency, lang: SupportedLang): string {
  const amount = amountEur * EXCHANGE_RATES[currency];
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'matik_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    defaultNS: 'translation',
  });

export default i18n;
