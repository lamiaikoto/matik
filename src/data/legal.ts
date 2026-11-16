/**
 * Informations légales de l'éditeur du site Matik.
 *
 * ⚠️ Les champs marqués « à compléter » doivent impérativement être renseignés
 * avant la mise en production commerciale (obligation LCEN, art. 6-III).
 * Ils sont centralisés ici pour être corrigés en un seul endroit.
 */
export const LEGAL_ENTITY = {
  brand: 'Matik',
  companyName: 'Matikilou',
  siteUrl: 'https://matikilou.com',
  email: 'contact@matikilou.com',
  phone: '01 89 45 20 00',

  // ── À compléter avant mise en production ──────────────────────────────────
  legalForm: '[à compléter : forme juridique]',
  capital: '[à compléter : capital social]',
  siret: '[à compléter : SIRET]',
  rcs: '[à compléter : RCS et ville d’immatriculation]',
  vat: '[à compléter : numéro de TVA intracommunautaire]',
  address: '[à compléter : adresse du siège social]',
  publicationDirector: '[à compléter : nom du directeur de la publication]',
  mediator: '[à compléter : nom et coordonnées du médiateur de la consommation]',
  dpoContact: 'contact@matikilou.com',

  // ── Hébergeur ─────────────────────────────────────────────────────────────
  hostingName: 'Vercel Inc.',
  hostingAddress: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
  hostingUrl: 'https://vercel.com',

  // ── Version des documents ─────────────────────────────────────────────────
  termsVersion: '2026-11-16',
  lastUpdated: '16 novembre 2026',
} as const;
