import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  FileText,
  RefreshCw,
  CheckCircle2,
  Lock,
  Download,
  Eye,
  ArrowRight,
  HelpCircle,
  QrCode,
  Sparkles,
  Building2,
  User,
  Printer,
  Check,
  FileCheck,
} from 'lucide-react';
import { CurrentUser } from '../types';

interface GarantiesPageProps {
  onStartBooking: () => void;
  onExploreCatalog: () => void;
  currentUser?: CurrentUser;
}

export const GarantiesPage: React.FC<GarantiesPageProps> = ({
  onStartBooking,
  onExploreCatalog,
  currentUser,
}) => {
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [usePersonalData, setUsePersonalData] = useState(false);

  const hasLoueurProfile =
    currentUser && (currentUser.role === 'loueur_pro' || currentUser.role === 'loueur_particulier');

  return (
    <div className="py-12 lg:py-20 bg-[#F8FAFC] text-slate-900 min-h-[calc(100vh-80px)] space-y-16 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sécurité Juridique & Bancaire Matik</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
            Garanties, Caution Stripe & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800">
              Contrats Numériques Conformes
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Louer du matériel professionnel et particulier exige une confiance absolue.
            Découvrez nos mécanismes technologiques et juridiques conçus pour sécuriser chaque transaction sans avance de trésorerie inutile.
          </p>
        </div>

        {/* 3 Pillars Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-950">01. Caution Stripe Sans Débit</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Une simple pré-autorisation bancaire (hold) est effectuée sur la carte du locataire.
              <strong> Aucun euro n'est prélevé</strong> de votre compte lors de la réservation.
            </p>
            <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fixée librement par le propriétaire du matériel</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Protocole 3D Secure v2 & chiffrement bancaire certifié</span>
              </li>
            </ul>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-950">02. Contrat Conforme sous 30s</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dès la validation de votre réservation, un contrat complet certifié conforme au droit français
              est généré et adressé aux deux parties par e-mail avec signature électronique.
            </p>
            <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Articles 1714 et suivants du Code civil</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Horodatage cryptographique certifié eIDAS</span>
              </li>
            </ul>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-950">03. Restitution & Levée d'Empreinte</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Le retour s'effectue avec un état des lieux contradictoire rapide.
              La caution bancaire sous séquestre est automatiquement débloquée sous 24h sans frais.
            </p>
            <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Contrôle rapide par QR Code de clôture</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Levée immédiate de l'autorisation bancaire</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Deep Dive Section 1: Stripe Caution Diagram */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-8">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Mécanisme Technologique
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
              Comment fonctionne concrètement l'empreinte bancaire Stripe ?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Contrairement aux dépôts de garantie classiques encaissés puis remboursés plusieurs semaines après avec perte de trésorerie,
              Matik utilise l'API de capture différée (Payment Intent Hold) de Stripe.
            </p>
          </div>

          {/* Steps Visual */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                1
              </div>
              <div className="font-bold text-slate-950 text-sm">Saisie de la carte</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Le locataire renseigne sa carte sur la page sécurisée Stripe 3DS v2 reçue par email.
              </p>
              <div className="text-[11px] text-emerald-700 font-bold tabular-nums">Débit bancaire : 0,00 €</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                2
              </div>
              <div className="font-bold text-slate-950 text-sm">Réservation de caution</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                La banque de l'emprunteur garantit la solvabilité pour le montant fixé par le loueur (ex: 300 €, 500 € ou 1 500 €).
              </p>
              <div className="text-[11px] text-amber-700 font-bold">Statut : Séquestre sans débit</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                3
              </div>
              <div className="font-bold text-slate-950 text-sm">Chantier & Utilisation</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Le locataire travaille en toute sérénité. Le matériel est couvert par l'assurance casse & vol tous risques.
              </p>
              <div className="text-[11px] text-blue-700 font-bold">Période de location active</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                4
              </div>
              <div className="font-bold text-slate-950 text-sm">Restitution & Levée</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Dès la confirmation du retour en bon état, l'autorisation Stripe expire automatiquement.
              </p>
              <div className="text-[11px] text-emerald-700 font-bold">Déblocage total sous 24h</div>
            </div>
          </div>
        </div>

        {/* Deep Dive Section 2: Contract Preview & Official Specimen Template (CLEAN & VIERGE) */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Cadre Juridique Conforme</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Modèle type de contrat de location & cautionnement
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Spécimen officiel conforme aux articles 1713 et suivants du Code civil français.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasLoueurProfile && (
                <button
                  type="button"
                  onClick={() => setUsePersonalData(!usePersonalData)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    usePersonalData
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200'
                  }`}
                >
                  {usePersonalData ? '✓ Vue personnalisée avec mon profil' : 'Prévisualiser avec mes données'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsContractModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-amber-400/20"
              >
                <Eye className="w-4 h-4 text-slate-950" />
                <span>Ouvrir le contrat complet</span>
              </button>
            </div>
          </div>

          {/* Clean Official Contract Specimen Card (Vierge et bien construit) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-6 text-xs text-slate-800 shadow-2xs">
            {/* Header Document */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  RÉPUBLIQUE FRANÇAISE · CONVENTION DE MISE À DISPOSITION & DE SÉQUESTRE
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Document officiel dématérialisé édité par la plateforme Matik
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                  RÉF : CONTRAT-MATIK-[ANNÉE]-[ID_UNIQUE]
                </span>
              </div>
            </div>

            {/* Contract Parties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-white border border-slate-200">
              {/* Party 1: Le Loueur */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Partie 1 : Le Loueur (Propriétaire / Bailleur)</span>
                </div>

                {usePersonalData && hasLoueurProfile ? (
                  <div className="space-y-1 text-slate-700">
                    <div className="font-bold text-slate-950 text-sm">
                      {currentUser && 'companyName' in currentUser
                        ? currentUser.companyName
                        : `${(currentUser as any)?.prenom || ''} ${(currentUser as any)?.nom || ''}`}
                    </div>
                    {currentUser && 'siret' in currentUser && (
                      <div className="text-slate-600">
                        SIRET : <span className="font-semibold">{currentUser.siret}</span>
                      </div>
                    )}
                    <div className="text-slate-600">
                      Responsable :{' '}
                      <span className="font-semibold">
                        {currentUser && 'name' in currentUser
                          ? currentUser.name
                          : currentUser && 'prenom' in currentUser
                          ? `${currentUser.prenom} ${currentUser.nom}`
                          : '-'}
                      </span>
                    </div>
                    <div className="text-slate-500">{currentUser?.email} · {currentUser?.city}</div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
                    <div className="text-slate-800 font-semibold italic">
                      [Raison sociale ou Nom & Prénom du Loueur]
                    </div>
                    <div className="text-[11px] text-slate-500">
                      [Numéro SIRET si Professionnel ou Pièce d'identité vérifiée si Particulier]
                    </div>
                    <div className="text-[11px] text-slate-500">
                      [Adresse du dépôt / Atelier de retrait] · [Email certifié & Téléphone]
                    </div>
                  </div>
                )}
              </div>

              {/* Party 2: Le Locataire */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Partie 2 : Le Locataire (Emprunteur / Preneur)</span>
                </div>

                <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
                  <div className="text-slate-800 font-semibold italic">
                    [Nom, Prénom ou Société du Locataire]
                  </div>
                  <div className="text-[11px] text-slate-500">
                    [Statut : Particulier ou Entreprise cliente avec contact habilité]
                  </div>
                  <div className="text-[11px] text-slate-500">
                    [Email certifié de notification] · [Téléphone mobile vérifié pour SMS 3DS]
                  </div>
                </div>
              </div>
            </div>

            {/* Articles Details in Contract */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <div className="text-slate-950 font-bold text-xs uppercase tracking-wide">
                  Article 1 · Objet de la mise à disposition & état contradictoire
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Le Loueur met à disposition du Locataire l'équipement référencé :{' '}
                  <span className="font-semibold text-slate-800 italic">[Désignation précise, marque, modèle, n° de série et accessoires inventoriés]</span>.
                  Un contrôle contradictoire de départ atteste du bon état de marche, de propreté et de la conformité aux normes CE en vigueur.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <div className="text-slate-950 font-bold text-xs uppercase tracking-wide">
                  Article 2 · Cautionnement et empreinte bancaire Stripe non débitée
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Le Locataire souscrit une pré-autorisation bancaire obligatoire d'un montant de{' '}
                  <span className="font-semibold text-amber-700 italic">[Montant de la caution fixé par le loueur en euros]</span>{' '}
                  auprès de l'opérateur de paiement certifié Stripe. Aucun débit effectif n'est opéré sur le compte bancaire du Locataire.
                  Cette garantie sert exclusivement de gage en cas de détérioration constatée lors du retour ou de non-restitution du matériel.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <div className="text-slate-950 font-bold text-xs uppercase tracking-wide">
                  Article 3 · Restitution, clôture et déblocage de la garantie
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  À l'échéance de la période de location convenue (<span className="italic font-semibold text-slate-800">[Date de début au Date de restitution]</span>),
                  le matériel est restitué au lieu convenu. Dès la validation de la restitution en bon état, l'empreinte bancaire
                  est levée de plein droit sous un délai maximal de 24 heures.
                </p>
              </div>
            </div>

            {/* Signature Blocks Mockup */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                <div className="text-slate-500 font-semibold text-[11px]">Pour le Loueur :</div>
                <div className="text-slate-900 font-bold">Signature électronique certifiée</div>
                <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Horodaté cryptographiquement eIDAS</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                <div className="text-slate-500 font-semibold text-[11px]">Pour le Locataire :</div>
                <div className="text-slate-900 font-bold">Signature numérique et empreinte 3DS</div>
                <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Validé sans débit immédiat</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Processus de restitution */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Processus de restitution
            </span>
            <h2 className="text-2xl font-bold text-slate-950">
              Comment se déroule la fin de location ?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Une procédure transparente et numérisée en moins de 3 minutes chez le loueur partenaire ou particulier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-xs">
                A
              </div>
              <h4 className="font-bold text-slate-950 text-sm">Scan du QR Code</h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                À votre arrivée au point de rendez-vous, le loueur scanne le QR code de restitution présent sur votre email de confirmation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-xs">
                B
              </div>
              <h4 className="font-bold text-slate-950 text-sm">Contrôle contradictoire</h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                Vérification rapide du bon état de fonctionnement du matériel, de sa propreté et de la présence des accessoires inventoriés.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                C
              </div>
              <h4 className="font-bold text-slate-950 text-sm">Libération de caution instantanée</h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                Validation conjointe sur le terminal : l'empreinte bancaire de caution est immédiatement clôturée sans aucun prélèvement.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Bottom Banner */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Prêt à louer en toute sérénité ?
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-900 max-w-xl">
              Choisissez votre matériel parmi les équipements révisés et disponibles immédiatement avec caution Stripe sécurisée.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onExploreCatalog}
              className="px-6 py-3 rounded-xl bg-slate-950 text-white hover:bg-slate-900 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              Parcourir le catalogue
            </button>
          </div>
        </div>
      </div>

      {/* Contract Modal Specimen (Complet et Imprimable) */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Top Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-950">Spécimen Officiel de Contrat Matik</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Imprimer le modèle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 text-xs font-bold cursor-pointer"
                >
                  Fermer [✕]
                </button>
              </div>
            </div>

            {/* Contract Complete Content */}
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <div className="font-bold text-slate-950 uppercase text-xs">
                  CONTRAT TYPE DE MISE À DISPOSITION DE MATÉRIEL ET CONVENTION DE SÉQUESTRE
                </div>
                <div className="text-[11px] text-slate-500">
                  Régie par les articles 1713 à 1778 du Code civil français · Édition standard certifiée Matik
                </div>
              </div>

              <div className="space-y-3">
                <p>
                  <strong className="text-slate-950">ARTICLE 1 · PARTIES CONTRACTANTES :</strong> Le contrat est conclu entre le Loueur, personne physique ou morale désignée, et le Locataire signataire, après validation de son identité et acceptation des présentes conditions générales.
                </p>
                <p>
                  <strong className="text-slate-950">ARTICLE 2 · OBJET DU PRÊT / MISE À DISPOSITION :</strong> Le Loueur met à disposition temporaire un équipement conforme aux normes de sécurité, en bon état de marche, nettoyé et muni de ses accessoires. Un contrôle contradictoire est réalisé lors de la prise en charge.
                </p>
                <p>
                  <strong className="text-slate-950">ARTICLE 3 · CAUTION BANCAIRE SÉCURISÉE (STRIPE HOLD) :</strong> Pour chaque location, une garantie financière sous forme d'empreinte bancaire préalable est requise. Le montant est fixé obligatoirement par le loueur lors de la création de l'annonce. Aucun montant n'est débité du compte du locataire au moment de la signature.
                </p>
                <p>
                  <strong className="text-slate-950">ARTICLE 4 · COUVERTURE ASSURANCE & VOL :</strong> Tout matériel loué via la plateforme bénéficie de la couverture responsabilité et casse accidentelle sous réserve du respect des consignes normales d'utilisation du fabricant.
                </p>
                <p>
                  <strong className="text-slate-950">ARTICLE 5 · RESTITUTION & LEVÉE DE GARANTIE :</strong> À la date fixée de restitution, un examen visuel conjointe est opéré. La clôture de l'empreinte bancaire est automatique et libère la réservation de fonds sous 24h ouvrées.
                </p>
                <p>
                  <strong className="text-slate-950">ARTICLE 6 · DROIT APPLICABLE & SIGNATURE ÉLECTRONIQUE :</strong> Le présent contrat est régi par la législation française. La signature numérique a valeur probante équivalente à une signature manuscrite conformément au règlement eIDAS n° 910/2014.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
