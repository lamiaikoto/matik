import { CurrentUser } from '../types';

/**
 * Retire les surnoms, mentions parasites et guillemets d'un nom de compte :
 * « Jean « Johnny » Dupont », « Jean (Johnny) Dupont », « "Jean Dupont" »… → « Jean Dupont ».
 * Si une adresse e-mail est passée, elle est immédiatement rejetée (chaîne vide).
 */
export const stripAccountNicknames = (value?: string | null): string => {
  if (!value) return '';
  let str = value.toString().trim();

  // Ne jamais traiter une adresse e-mail comme un nom
  if (str.includes('@')) return '';

  // Supprime le contenu entre parenthèses ou crochets
  str = str.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');

  // Supprime les guillemets englobants
  str = str.replace(/^["“”«»„'’`]+|["“”«»„'’`]+$/g, '').trim();

  // Supprime les surnoms isolés entre guillemets ("Johnny", 'Johnny', etc.)
  str = str.replace(/["“”«»„'’`][^"“”«»„'’`]*["“”«»„'’`]/g, ' ');

  // Supprime tout guillemet résiduel
  str = str.replace(/["“”«»„'’`]/g, '');

  return str.replace(/\s+/g, ' ').trim();
};

const capitalize = (value: string): string =>
  value ? value[0].toLocaleUpperCase('fr-FR') + value.slice(1) : '';

/**
 * Anonymise un nom complet en respectant la vie privée :
 * « Jean Dupont » → « Jean D. »
 * « Sheriff » → « Sheriff »
 * « Jean "Johnny" Dupont » → « Jean D. »
 * Ne conserve aucun surnom entre guillemets ni état civil complet.
 */
export const anonymizeFullName = (fullName?: string | null): string => {
  const cleaned = stripAccountNicknames(fullName);
  if (!cleaned) return '';

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) return '';

  const prenom = capitalize(parts[0]);
  if (parts.length === 1) {
    return prenom;
  }

  // Trouve la première lettre alphabétique du nom de famille
  const familyPart = parts.slice(1).find((part) => /\p{L}/u.test(part));
  const familyLetter = familyPart ? familyPart.replace(/[^\p{L}]/gu, '')[0] : '';
  const initial = familyLetter ? `${familyLetter.toLocaleUpperCase('fr-FR')}.` : '';

  return [prenom, initial].filter(Boolean).join(' ');
};

/**
 * Suggestion de « Nom affiché du loueur » :
 * - Professionnel : sa raison sociale si distincte de son nom personnel et sans e-mail ;
 * - Particulier : strictement Prénom + initiale du nom (« Sheriff G. »), sans surnom
 *   ni guillemets.
 * - Si aucune information exploitable (ou compte OAuth avec seulement un e-mail) : chaîne vide,
 *   afin de laisser le placeholder explicite s'afficher (« Ex : Sheriff G. ou Atelier Pro 95 »).
 */
export const buildPublicDisplayNameSuggestion = (user?: CurrentUser | null): string => {
  if (!user) return '';

  if (user.role === 'loueur_pro') {
    const company = stripAccountNicknames(user.companyName);
    const accountName = stripAccountNicknames(user.name);
    if (company && company !== accountName && !company.includes('@')) {
      return company;
    }
    return anonymizeFullName(company || accountName || user.prenom);
  }

  const prenomRaw = ('prenom' in user && user.prenom ? user.prenom : '') || '';
  const nomRaw = ('nom' in user && user.nom ? user.nom : '') || '';

  const cleanPrenom = stripAccountNicknames(prenomRaw);
  const cleanNom = stripAccountNicknames(nomRaw);

  if (cleanPrenom) {
    // Si prenom contient déjà 2 mots et que nom est vide
    const prenomParts = cleanPrenom.split(' ').filter(Boolean);
    if (prenomParts.length > 1 && !cleanNom) {
      return anonymizeFullName(cleanPrenom);
    }

    const prenom = capitalize(prenomParts[0]);
    const familyLetter = cleanNom ? cleanNom.replace(/[^\p{L}]/gu, '')[0] : '';
    const initial = familyLetter ? `${familyLetter.toLocaleUpperCase('fr-FR')}.` : '';
    return [prenom, initial].filter(Boolean).join(' ');
  }

  // Repli sur user.name si disponible et non e-mail
  const accountName = stripAccountNicknames(user.name);
  if (accountName) {
    return anonymizeFullName(accountName);
  }

  return '';
};

/**
 * Détermine le libellé public affiché sur les cartes et la fiche détail.
 * - Rejette systématiquement les e-mails
 * - Pour les annonces enregistrées avec displayNameChosen = true : affiche le nom choisi
 * - Pour les annonces historiques dont le nom correspond à l'état civil complet ou au compte :
 *   anonymise en « Prénom N. »
 * - Repli sécurisé en dernier recours (« Loueur Partenaire Matik »)
 */
export const resolvePublicDisplayName = (
  storedDisplayName?: string | null,
  accountName?: string | null,
  displayNameChosen = false
): string => {
  const isEmail = (val?: string | null) => Boolean(val && val.includes('@'));

  let stored = stripAccountNicknames(storedDisplayName);
  if (isEmail(stored)) {
    stored = '';
  }

  let account = stripAccountNicknames(accountName);
  if (isEmail(account)) {
    account = '';
  }

  // Choix libre explicite (sauvegarde récente)
  if (displayNameChosen && stored) {
    return stored;
  }

  // Annonce existante / historique
  if (stored) {
    const sameAsAccount = account && stored.toLocaleLowerCase('fr-FR') === account.toLocaleLowerCase('fr-FR');
    const parts = stored.split(' ').filter(Boolean);
    if (sameAsAccount || (parts.length === 2 && !displayNameChosen)) {
      return anonymizeFullName(stored);
    }
    return stored;
  }

  if (account) {
    return anonymizeFullName(account);
  }

  return 'Loueur Partenaire Matik';
};
