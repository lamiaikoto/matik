/**
 * Régions françaises (métropole + outre-mer).
 * Utilisées par le formulaire d'annonce et les filtres du catalogue.
 */
export const FRENCH_REGIONS = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
  'Guadeloupe',
  'Guyane',
  'La Réunion',
  'Martinique',
  'Mayotte',
] as const;

export type FrenchRegion = (typeof FRENCH_REGIONS)[number];

/**
 * Normalise une chaîne pour une recherche souple :
 * minuscules, sans accents, espaces multiples réduits.
 */
export const normalizeText = (value?: string | null): string =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Vérifie si l'un des champs contient le terme recherché (recherche souple).
 */
export const matchesSoftQuery = (
  fields: Array<string | null | undefined>,
  query: string
): boolean => {
  const needle = normalizeText(query);
  if (!needle) return true;
  return fields.some((field) => normalizeText(field).includes(needle));
};

/**
 * Construit un libellé de localisation lisible : « Ville (33000) · Région ».
 */
export const formatLocation = (
  city?: string | null,
  postalCode?: string | null,
  region?: string | null
): string => {
  const cityPart = [city, postalCode ? `(${postalCode})` : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  return [cityPart, region].filter(Boolean).join(' · ');
};
