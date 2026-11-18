import React, { useEffect } from 'react';
import { ArrowLeft, FileText, Lock, ShieldCheck } from 'lucide-react';
import { LEGAL_ENTITY, LEGAL_FIELD_LABELS, MISSING_LEGAL_FIELDS, type LegalFieldKey } from '../data/legal';

export type LegalPageType = 'mentions-legales' | 'cgu' | 'confidentialite';

interface LegalPageProps {
  page: LegalPageType;
  onBack: () => void;
}

const LastUpdated: React.FC = () => (
  <p className="text-xs text-slate-500">
    Dernière mise à jour : {LEGAL_ENTITY.lastUpdated} · Version {LEGAL_ENTITY.termsVersion}
  </p>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-lg sm:text-xl font-bold text-slate-950 tracking-tight">{title}</h2>
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">{children}</div>
  </section>
);

/**
 * Bandeau d'avertissement affiché UNIQUEMENT si des informations légales
 * obligatoires sont encore manquantes. Il se retire tout seul dès que les
 * variables d'environnement VITE_LEGAL_* sont renseignées.
 */
const CompletionNotice: React.FC<{ fields: LegalFieldKey[] }> = ({ fields }) => {
  if (fields.length === 0) return null;
  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
      <strong className="font-bold">Informations à compléter avant mise en production :</strong>
      <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
        {fields.map((key) => (
          <li key={key}>{LEGAL_FIELD_LABELS[key]}</li>
        ))}
      </ul>
      <p className="mt-1.5">
        Ces champs sont obligatoires (LCEN art. 6-III, Code de la consommation art. L612-1). Les
        valeurs restent visibles en l'état sur le site public.
      </p>
    </div>
  );
};

/** Filtre les champs incomplets pertinents pour une page donnée. */
const missingFields = (keys: LegalFieldKey[]): LegalFieldKey[] =>
  keys.filter((key) => MISSING_LEGAL_FIELDS.includes(key));

const EditorIdentity: React.FC = () => (
  <ul className="space-y-1.5">
    <li>
      <strong className="text-slate-900">Dénomination sociale :</strong> {LEGAL_ENTITY.companyName}
      {' '}(nom commercial : {LEGAL_ENTITY.brand})
    </li>
    <li>
      <strong className="text-slate-900">Forme juridique :</strong> {LEGAL_ENTITY.legalForm}
    </li>
    <li>
      <strong className="text-slate-900">Capital social :</strong> {LEGAL_ENTITY.capital}
    </li>
    <li>
      <strong className="text-slate-900">Siège social :</strong> {LEGAL_ENTITY.address}
    </li>
    <li>
      <strong className="text-slate-900">SIRET :</strong> {LEGAL_ENTITY.siret}
    </li>
    <li>
      <strong className="text-slate-900">Immatriculation :</strong> {LEGAL_ENTITY.rcs}
    </li>
    <li>
      <strong className="text-slate-900">TVA intracommunautaire :</strong> {LEGAL_ENTITY.vat}
    </li>
    <li>
      <strong className="text-slate-900">Directeur de la publication :</strong>{' '}
      {LEGAL_ENTITY.publicationDirector}
    </li>
    <li>
      <strong className="text-slate-900">Contact :</strong> {LEGAL_ENTITY.email} · {LEGAL_ENTITY.phone}
    </li>
  </ul>
);

const MentionsLegales: React.FC = () => (
  <div className="space-y-8">
    <CompletionNotice
      fields={missingFields([
        'legalForm',
        'capital',
        'address',
        'siret',
        'rcs',
        'vat',
        'publicationDirector',
      ])}
    />

    <Section title="1. Éditeur du site">
      <p>
        Le site {LEGAL_ENTITY.siteUrl} (ci-après « le Site ») est édité par {LEGAL_ENTITY.companyName},
        exploitant la marque {LEGAL_ENTITY.brand}.
      </p>
      <EditorIdentity />
    </Section>

    <Section title="2. Hébergement">
      <p>
        Le Site est hébergé par <strong className="text-slate-900">{LEGAL_ENTITY.hostingName}</strong>,
        dont le siège est situé {LEGAL_ENTITY.hostingAddress}.
      </p>
      <p>
        Site de l'hébergeur :{' '}
        <a
          href={LEGAL_ENTITY.hostingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-700 underline underline-offset-2 hover:text-amber-800"
        >
          {LEGAL_ENTITY.hostingUrl}
        </a>
      </p>
    </Section>

    <Section title="3. Activité et nature du service">
      <p>
        {LEGAL_ENTITY.brand} est une plateforme de mise en relation entre des personnes souhaitant louer
        du matériel (outillage, équipements high-tech, matériel événementiel, véhicules, objets divers) et
        des propriétaires souhaitant le mettre en location.
      </p>
      <p>
        {LEGAL_ENTITY.brand} agit en qualité d'intermédiaire technique. Le contrat de location est conclu
        directement entre le loueur et le locataire. {LEGAL_ENTITY.brand} n'est ni propriétaire, ni
        assureur, ni transporteur du matériel loué.
      </p>
    </Section>

    <Section title="4. Propriété intellectuelle">
      <p>
        L'ensemble des éléments du Site (structure, textes, logos, marques, illustrations, bases de
        données, code source et éléments graphiques) est protégé par le droit de la propriété
        intellectuelle et demeure la propriété exclusive de {LEGAL_ENTITY.companyName} ou de ses
        partenaires.
      </p>
      <p>
        Toute reproduction, représentation, modification ou exploitation, totale ou partielle, sans
        autorisation écrite préalable est interdite et pourrait constituer une contrefaçon au sens des
        articles L.335-2 et suivants du Code de la propriété intellectuelle.
      </p>
    </Section>

    <Section title="5. Responsabilité">
      <p>
        {LEGAL_ENTITY.companyName} s'efforce d'assurer l'exactitude des informations publiées et la
        disponibilité du Site. Toutefois, le Site est fourni « en l'état » et peut comporter des
        inexactitudes, des omissions ou des interruptions temporaires.
      </p>
      <p>
        {LEGAL_ENTITY.companyName} ne saurait être tenue responsable des dommages indirects résultant de
        l'utilisation du Site ou de l'inexécution des obligations contractuelles par un loueur ou un
        locataire.
      </p>
    </Section>

    <Section title="6. Liens externes">
      <p>
        Le Site peut contenir des liens vers des sites tiers. {LEGAL_ENTITY.companyName} n'exerce aucun
        contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leur disponibilité ou
        leurs pratiques en matière de données personnelles.
      </p>
    </Section>

    <Section title="7. Droit applicable">
      <p>
        Les présentes mentions légales sont soumises au droit français. En cas de litige, et à défaut de
        résolution amiable, les tribunaux français seront compétents dans les conditions prévues par la
        loi.
      </p>
    </Section>
  </div>
);

const CGU: React.FC = () => (
  <div className="space-y-8">
    <CompletionNotice fields={missingFields(['mediator', 'address'])} />

    <Section title="1. Objet">
      <p>
        Les présentes conditions générales d'utilisation et de vente (ci-après « CGU / CGV ») régissent
        l'accès au Site {LEGAL_ENTITY.siteUrl} et l'utilisation de la plateforme {LEGAL_ENTITY.brand},
        ainsi que les prestations de mise en relation proposées par {LEGAL_ENTITY.companyName}.
      </p>
      <p>
        Toute inscription ou utilisation du Site implique l'acceptation pleine et entière des présentes
        conditions. L'utilisateur déclare avoir la capacité juridique de contracter.
      </p>
    </Section>

    <Section title="2. Inscription et compte">
      <p>
        La création d'un compte est gratuite. L'utilisateur s'engage à fournir des informations exactes,
        complètes et à jour, et à les mettre à jour en cas de changement. Les identifiants sont personnels
        et confidentiels : l'utilisateur est responsable de toute activité effectuée depuis son compte.
      </p>
      <p>
        {LEGAL_ENTITY.brand} peut suspendre ou résilier un compte en cas de manquement aux présentes
        conditions, de comportement frauduleux ou de mise en danger d'autres utilisateurs.
      </p>
    </Section>

    <Section title="3. Rôle de la plateforme">
      <p>
        {LEGAL_ENTITY.brand} met à disposition un outil technique permettant la publication d'annonces,
        la réservation et la gestion des états des lieux. Le contrat de location est conclu directement
        entre le loueur et le locataire ; {LEGAL_ENTITY.brand} n'est pas partie à ce contrat.
      </p>
      <p>
        {LEGAL_ENTITY.brand} n'est pas assureur. Il appartient à chaque partie de vérifier qu'elle
        dispose des garanties d'assurance nécessaires pour l'usage prévu du matériel.
      </p>
    </Section>

    <Section title="4. Annonces et obligations du loueur">
      <p>Le loueur s'engage notamment à :</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>décrire le matériel de manière loyale, précise et complète ;</li>
        <li>ne proposer que du matériel dont il est propriétaire ou qu'il est habilité à louer ;</li>
        <li>remettre un matériel propre, en état de fonctionnement et conforme à l'annonce ;</li>
        <li>respecter les obligations légales applicables à son activité (notamment fiscales et sociales) ;</li>
        <li>réaliser un état des lieux contradictoire au départ et au retour.</li>
      </ul>
    </Section>

    <Section title="5. Réservations et obligations du locataire">
      <p>Le locataire s'engage notamment à :</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>fournir des informations exactes et un moyen de paiement valide ;</li>
        <li>utiliser le matériel conformément à sa destination et aux consignes du loueur ;</li>
        <li>ne pas sous-louer le matériel sans accord écrit du loueur ;</li>
        <li>restituer le matériel à la date et au lieu convenus, dans l'état constaté au départ ;</li>
        <li>signaler sans délai tout dommage, vol ou perte.</li>
      </ul>
    </Section>

    <Section title="6. Prix et paiement">
      <p>
        Les prix sont indiqués en euros, toutes taxes comprises, sur la page de réservation. Le montant
        total (location et éventuels frais de service) est recalculé côté serveur avant validation.
      </p>
      <p>
        Le paiement de la location est traité par notre prestataire de paiement Stripe. Les données de
        carte ne sont jamais stockées par {LEGAL_ENTITY.brand}. La réservation n'est définitive qu'après
        confirmation du paiement.
      </p>
    </Section>

    <Section title="7. Caution et empreinte bancaire">
      <p>
        Une empreinte bancaire (pré-autorisation) peut être demandée par le loueur. Son montant est fixé
        par le loueur et affiché avant la validation. Cette empreinte ne constitue pas un débit immédiat :
        elle réserve un montant sur la carte du locataire.
      </p>
      <p>
        Après restitution du matériel, le loueur procède à l'état des lieux contradictoire puis libère
        l'empreinte. En cas de dommage, de perte ou de non-restitution, tout ou partie du montant réservé
        peut être capturé, dans les conditions prévues par le contrat de location et la réglementation
        applicable.
      </p>
      <p>
        Les demandes de libération de caution et les signalements de litige sont réservés au loueur. Le
        locataire peut signaler la restitution et joindre des photos, mais ne peut pas clôturer lui-même
        la location ni libérer la caution.
      </p>
    </Section>

    <Section title="8. État des lieux contradictoire">
      <p>
        Un état des lieux photo peut être réalisé au départ et au retour. Les constats, photos et
        horodatages sont enregistrés avec la réservation et constituent un élément de preuve entre les
        parties. Ils ne se substituent pas à un constat amiable ou à une expertise si les parties le
        jugent nécessaire.
      </p>
    </Section>

    <Section title="9. Annulation, retard et restitution">
      <p>
        Les conditions d'annulation applicables sont celles affichées au moment de la réservation. En cas
        de retard de restitution, le loueur peut facturer la période supplémentaire et, le cas échéant,
        retenir tout ou partie de la caution, conformément au contrat.
      </p>
    </Section>

    <Section title="10. Assurance et responsabilité">
      <p>
        {LEGAL_ENTITY.brand} ne fournit aucune couverture d'assurance. Le loueur et le locataire sont
        seuls responsables de leurs assurances respectives (responsabilité civile, multirisque
        professionnelle, garantie du matériel loué, etc.).
      </p>
      <p>
        Le locataire est responsable du matériel pendant toute la durée de la location. Le loueur est
        responsable de la conformité de l'annonce et de l'état du matériel remis.
      </p>
    </Section>

    <Section title="11. Avis">
      <p>
        Les avis ne peuvent être déposés que par le locataire d'une réservation terminée. Les avis
        contraires à la loi, diffamatoires ou manifestement frauduleux peuvent être retirés.
      </p>
    </Section>

    <Section title="12. Données personnelles">
      <p>
        Le traitement des données personnelles est décrit dans la politique de confidentialité accessible
        depuis le pied de page du Site.
      </p>
    </Section>

    <Section title="13. Droit applicable et règlement des litiges">
      <p>
        Les présentes CGU / CGV sont soumises au droit français. En cas de litige, les parties
        s'efforceront de trouver une solution amiable. Le consommateur peut recourir gratuitement au
        médiateur de la consommation compétent : {LEGAL_ENTITY.mediator}.
      </p>
      <p>
        À défaut de résolution amiable, le litige sera porté devant les juridictions françaises
        compétentes, dans le respect des règles protectrices applicables aux consommateurs.
      </p>
    </Section>

    <Section title="14. Évolution des conditions">
      <p>
        {LEGAL_ENTITY.companyName} peut modifier les présentes conditions à tout moment. La version
        applicable est celle en vigueur au moment de la réservation. Les utilisateurs seront informés de
        toute modification substantielle.
      </p>
    </Section>
  </div>
);

const Confidentialite: React.FC = () => (
  <div className="space-y-8">
    <CompletionNotice fields={missingFields(['address'])} />

    <Section title="1. Responsable du traitement">
      <p>
        Le responsable du traitement des données personnelles collectées sur le Site est{' '}
        {LEGAL_ENTITY.companyName}, dont le siège est situé {LEGAL_ENTITY.address}.
      </p>
      <p>
        Contact pour toute question relative aux données personnelles : {LEGAL_ENTITY.dpoContact}.
      </p>
    </Section>

    <Section title="2. Données collectées">
      <p>Dans le cadre de l'utilisation du Site, nous pouvons collecter :</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong className="text-slate-900">Données d'identité et de contact :</strong> nom, prénom,
          raison sociale, SIRET, adresse e-mail, numéro de téléphone, ville.
        </li>
        <li>
          <strong className="text-slate-900">Données de compte :</strong> identifiant, rôle (loueur
          professionnel, loueur particulier, locataire), date d'acceptation des CGU.
        </li>
        <li>
          <strong className="text-slate-900">Données de réservation :</strong> matériel loué, dates,
          montants, statut, messages et états des lieux photo (y compris les images).
        </li>
        <li>
          <strong className="text-slate-900">Données de paiement :</strong> identifiants de transaction
          et statuts transmis par Stripe. Les numéros de carte ne sont jamais stockés par{' '}
          {LEGAL_ENTITY.brand}.
        </li>
        <li>
          <strong className="text-slate-900">Données techniques :</strong> adresse IP, journaux de
          connexion, type de navigateur, données de stockage local nécessaires au fonctionnement du Site.
        </li>
      </ul>
    </Section>

    <Section title="3. Finalités et bases légales">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-50 text-slate-900">
            <tr>
              <th className="text-left font-bold p-3 border-b border-slate-200">Finalité</th>
              <th className="text-left font-bold p-3 border-b border-slate-200">Base légale</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr>
              <td className="p-3 border-b border-slate-100">Création et gestion du compte</td>
              <td className="p-3 border-b border-slate-100">Exécution du contrat</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-slate-100">Gestion des réservations et des états des lieux</td>
              <td className="p-3 border-b border-slate-100">Exécution du contrat</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-slate-100">Traitement des paiements et des cautions</td>
              <td className="p-3 border-b border-slate-100">Exécution du contrat</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-slate-100">Prévention de la fraude et sécurité</td>
              <td className="p-3 border-b border-slate-100">Intérêt légitime</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-slate-100">Envoi de communications transactionnelles</td>
              <td className="p-3 border-b border-slate-100">Exécution du contrat</td>
            </tr>
            <tr>
              <td className="p-3">Respect des obligations légales et comptables</td>
              <td className="p-3">Obligation légale</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Les communications marketing ne sont envoyées qu'avec le consentement de l'utilisateur, qu'il peut
        retirer à tout moment.
      </p>
    </Section>

    <Section title="4. Destinataires et sous-traitants">
      <p>
        Les données sont accessibles aux personnes habilitées de {LEGAL_ENTITY.companyName} et à nos
        prestataires techniques, dans la limite de leurs missions :
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong className="text-slate-900">Supabase</strong> : hébergement de la base de données et
          authentification ;
        </li>
        <li>
          <strong className="text-slate-900">Stripe</strong> : traitement des paiements et des empreintes
          bancaires ;
        </li>
        <li>
          <strong className="text-slate-900">Vercel</strong> : hébergement du Site ;
        </li>
        <li>
          <strong className="text-slate-900">Prestataire d'envoi d'e-mails</strong> : communications
          transactionnelles liées aux réservations.
        </li>
      </ul>
      <p>
        Les données ne sont ni vendues ni cédées à des tiers. Elles peuvent être communiquées aux
        autorités administratives ou judiciaires lorsque la loi l'exige.
      </p>
    </Section>

    <Section title="5. Transferts hors Union européenne">
      <p>
        Certains prestataires (notamment Vercel, Supabase et Stripe) peuvent traiter des données en
        dehors de l'Union européenne. Dans ce cas, les transferts sont encadrés par les garanties
        appropriées prévues par le RGPD (clauses contractuelles types de la Commission européenne ou
        mécanisme équivalent).
      </p>
    </Section>

    <Section title="6. Durées de conservation">
      <p>
        Les données sont conservées pendant la durée nécessaire aux finalités décrites ci-dessus :
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>données de compte : pendant la vie du compte, puis suppression après une période d'inactivité raisonnable ;</li>
        <li>données de réservation et pièces contractuelles : pendant la durée de la relation contractuelle, puis pendant les délais légaux de prescription et de conservation comptable ;</li>
        <li>états des lieux et justificatifs de litige : pendant la durée nécessaire à la gestion du litige et aux délais de prescription applicables ;</li>
        <li>journaux techniques : pour une durée limitée, proportionnée à la sécurité du Site.</li>
      </ul>
    </Section>

    <Section title="7. Vos droits">
      <p>
        Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>droit d'accès à vos données ;</li>
        <li>droit de rectification ;</li>
        <li>droit à l'effacement (dans les limites des obligations légales) ;</li>
        <li>droit à la limitation du traitement ;</li>
        <li>droit d'opposition ;</li>
        <li>droit à la portabilité des données fournies ;</li>
        <li>droit de retirer votre consentement à tout moment, lorsque le traitement est fondé sur celui-ci.</li>
      </ul>
      <p>
        Pour exercer ces droits, écrivez à {LEGAL_ENTITY.dpoContact}. Une réponse vous sera adressée
        dans les délais prévus par la réglementation. Vous pouvez également introduire une réclamation
        auprès de la CNIL (www.cnil.fr).
      </p>
    </Section>

    <Section title="8. Cookies et stockage local">
      <p>
        Le Site utilise un stockage local strictement nécessaire au fonctionnement de la session
        (maintien de la connexion, préférences d'affichage, données de réservation en cours). Ces
        éléments ne servent pas au profilage publicitaire.
      </p>
      <p>
        Si des cookies de mesure d'audience ou de marketing sont ajoutés ultérieurement, un bandeau de
        consentement conforme sera mis en place.
      </p>
    </Section>

    <Section title="9. Sécurité">
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger les
        données contre la perte, l'accès non autorisé, l'altération ou la divulgation. Les paiements sont
        traités par Stripe selon les standards de sécurité applicables au secteur des paiements.
      </p>
    </Section>

    <Section title="10. Modification de la politique">
      <p>
        La présente politique peut être mise à jour pour tenir compte de l'évolution du Site ou de la
        réglementation. La date de dernière mise à jour figure en tête de document.
      </p>
    </Section>
  </div>
);

const PAGE_META: Record<LegalPageType, { title: string; subtitle: string; icon: React.ReactNode }> = {
  'mentions-legales': {
    title: 'Mentions légales',
    subtitle: "Informations relatives à l'éditeur et à l'hébergement du site.",
    icon: <FileText className="w-5 h-5" />,
  },
  cgu: {
    title: 'Conditions générales d’utilisation et de vente',
    subtitle: 'Les règles applicables à l’utilisation de la plateforme et aux locations.',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    subtitle: 'Comment nous collectons, utilisons et protégeons vos données personnelles.',
    icon: <Lock className="w-5 h-5" />,
  },
};

export const LegalPage: React.FC<LegalPageProps> = ({ page, onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);

  const meta = PAGE_META[page];

  return (
    <div className="py-10 lg:py-16 bg-[#F8FAFC] text-slate-900 min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au site</span>
        </button>

        <header className="space-y-3 pb-6 border-b border-slate-200">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <span className="text-amber-600">{meta.icon}</span>
            <span>{LEGAL_ENTITY.brand} · Informations légales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950">
            {meta.title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{meta.subtitle}</p>
          <LastUpdated />
        </header>

        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
          {page === 'mentions-legales' && <MentionsLegales />}
          {page === 'cgu' && <CGU />}
          {page === 'confidentialite' && <Confidentialite />}
        </div>

        <div className="text-xs text-slate-500 leading-relaxed">
          Ces documents sont fournis à titre informatif et doivent être relus par un professionnel du
          droit avant publication définitive. Pour toute question :{' '}
          <a
            href={`mailto:${LEGAL_ENTITY.email}`}
            className="text-amber-700 underline underline-offset-2 hover:text-amber-800"
          >
            {LEGAL_ENTITY.email}
          </a>
          .
        </div>
      </div>
    </div>
  );
};
