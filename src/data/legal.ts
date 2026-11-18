/**
 * Informations légales de l'éditeur du site Matik.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Ces champs sont obligatoires (LCEN art. 6-III) et la médiation de la
 * consommation est obligatoire pour la vente à distance aux particuliers
 * (art. L612-1 du Code de la consommation).
 *
 * Rien n'est inventé ici : chaque valeur manquante reste un placeholder
 * explicite et est signalée automatiquement dans les pages légales.
 *
 * Pour renseigner les informations sans toucher au code, définir dans
 * Vercel → Settings → Environment Variables (puis redéployer) :
 *
 *   VITE_LEGAL_FORM                  ex. « SAS »
 *   VITE_LEGAL_CAPITAL               ex. « 1 000 € »
 *   VITE_LEGAL_SIRET                 ex. « 123 456 789 00012 »
 *   VITE_LEGAL_RCS                   ex. « RCS Lyon 123 456 789 »
 *   VITE_LEGAL_VAT                   ex. « FR12345678901 »
 *   VITE_LEGAL_ADDRESS               ex. « 12 rue … 69000 Lyon »
 *   VITE_LEGAL_PUBLICATION_DIRECTOR  ex. « Prénom Nom »
 *   VITE_LEGAL_MEDIATOR              ex. « CM2C — 14 rue Saint-Jean, 75017 Paris »
 * ─────────────────────────────────────────────────────────────────────────────
 */

const env = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>;

const placeholder = (label: string): string => `[à compléter : ${label}]`;

/** Valeur fournie par l'environnement, sinon placeholder explicite. */
const legalValue = (envKey: string, label: string): string => {
  const raw = (env[envKey] || '').trim();
  return raw || placeholder(label);
};

export type LegalFieldKey =
  | 'legalForm'
  | 'capital'
  | 'siret'
  | 'rcs'
  | 'vat'
  | 'address'
  | 'publicationDirector'
  | 'mediator';

export const LEGAL_FIELD_LABELS: Record<LegalFieldKey, string> = {
  legalForm: 'Forme juridique',
  capital: 'Capital social',
  siret: 'SIRET',
  rcs: "RCS et ville d'immatriculation",
  vat: 'Numéro de TVA intracommunautaire',
  address: 'Adresse du siège social',
  publicationDirector: 'Directeur de la publication',
  mediator: 'Médiateur de la consommation (nom et coordonnées)',
};

export const LEGAL_ENTITY = {
  brand: 'Matik',
  companyName: 'Matikilou',
  siteUrl: 'https://matikilou.com',
  email: 'contact@matikilou.com',
  phone: '01 89 45 20 00',

  // ── Identité de l'éditeur (renseignable par variables d'environnement) ─────
  legalForm: legalValue('VITE_LEGAL_FORM', 'forme juridique'),
  capital: legalValue('VITE_LEGAL_CAPITAL', 'capital social'),
  siret: legalValue('VITE_LEGAL_SIRET', 'SIRET'),
  rcs: legalValue('VITE_LEGAL_RCS', "RCS et ville d'immatriculation"),
  vat: legalValue('VITE_LEGAL_VAT', 'numéro de TVA intracommunautaire'),
  address: legalValue('VITE_LEGAL_ADDRESS', 'adresse du siège social'),
  publicationDirector: legalValue('VITE_LEGAL_PUBLICATION_DIRECTOR', 'nom du directeur de la publication'),
  mediator: legalValue('VITE_LEGAL_MEDIATOR', 'nom et coordonnées du médiateur de la consommation'),
  dpoContact: 'contact@matikilou.com',

  // ── Hébergeur ─────────────────────────────────────────────────────────────
  hostingName: 'Vercel Inc.',
  hostingAddress: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
  hostingUrl: 'https://vercel.com',

  // ── Version des documents ─────────────────────────────────────────────────
  termsVersion: '2026-11-18',
  lastUpdated: '18 novembre 2026',
};

/** Détecte une valeur encore non renseignée. */
export const isLegalPlaceholder = (value?: string): boolean =>
  !value || /^\s*\[à compléter/i.test(value);

/** Champs encore incomplets, à afficher en avertissement sur les pages légales. */
export const MISSING_LEGAL_FIELDS: LegalFieldKey[] = (
  Object.keys(LEGAL_FIELD_LABELS) as LegalFieldKey[]
).filter((key) => isLegalPlaceholder(LEGAL_ENTITY[key]));

export const HAS_INCOMPLETE_LEGAL_INFO = MISSING_LEGAL_FIELDS.length > 0;

if (HAS_INCOMPLETE_LEGAL_INFO) {
  // Visible uniquement en développement : la page publique affiche le bandeau.
  try {
    if ((import.meta as any)?.env?.DEV) {
      console.warn(
        `[Mentions légales] ${MISSING_LEGAL_FIELDS.length} champ(s) à compléter : ` +
          MISSING_LEGAL_FIELDS.map((key) => LEGAL_FIELD_LABELS[key]).join(', ')
      );
    }
  } catch {
    /* noop */
  }
}
