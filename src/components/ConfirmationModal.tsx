import React, { useState } from 'react';
import { Equipment, BookingPayload } from '../types';
import { CounterpartContactCard } from './CounterpartContactCard';
import {
  CheckCircle2,
  Mail,
  CreditCard,
  FileText,
  Check,
  ExternalLink,
  X,
  ShieldAlert,
  ArrowRight,
  Download,
} from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: BookingPayload | null;
  details: {
    equipment: Equipment;
    clientPrenom: string;
    clientNom: string;
    clientEmail: string;
    startDate: string;
    endDate: string;
    sousTotal?: number;
    fraisService?: number;
    totalLocation: number;
    montantCaution: number;
    dureeJours: number;
    networkStatus: 'success' | 'cors_fallback' | 'simulated';
    stripeCheckoutUrl?: string | null;
  } | null;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  payload,
  details,
}) => {
  const [activeTab, setActiveTab] = useState<'contract' | 'stripe' | 'receipt'>('contract');

  if (!isOpen || !payload || !details) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-6 sm:p-8 pb-4 flex items-start justify-between border-b border-slate-100 bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                Réservation confirmée !
              </h3>
              {/* Mandatory requested message */}
              <p className="text-sm sm:text-base text-amber-700 font-semibold leading-snug">
                Vérifiez votre boîte mail pour valider votre empreinte de caution et signer votre contrat.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pills / Sub-navigation */}
        <div className="px-6 sm:px-8 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('contract')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'contract'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
              }`}
            >
              Contrat & E-mail
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stripe')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'stripe'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
              }`}
            >
              Empreinte Caution Stripe ({details.montantCaution} €)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receipt')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'receipt'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
              }`}
            >
              Attestation & Récépissé
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Réf: <span className="text-slate-900 font-bold">LOC-{Math.floor(100000 + Math.random() * 900000)}</span>
          </div>
        </div>

        {/* Modal Body Tabs */}
        <div className="p-6 sm:p-8 space-y-6">
          {activeTab === 'contract' && (
            <div className="space-y-5">
              {/* Email Notification Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Mail className="w-4 h-4 text-amber-500" />
                    <span>E-mail instantané expédié à :</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{details.clientEmail}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Objet de l'e-mail :</span>
                    <span className="font-bold text-slate-900 truncate max-w-[280px]">
                      [Matik] Votre contrat #{details.equipment.id.toUpperCase().slice(0, 6)} et caution Stripe
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    Bonjour {details.clientPrenom}, votre matériel « <strong className="text-slate-900 font-bold">{details.equipment.name}</strong> »
                    est bien pré-réservé du <span className="text-slate-900 font-mono font-semibold">{details.startDate}</span> au{' '}
                    <span className="text-slate-900 font-mono font-semibold">{details.endDate}</span> auprès du loueur{' '}
                    <strong className="text-slate-900 font-bold">{payload.artisan_nom}</strong>.
                  </p>
                </div>
              </div>

              {/* Mise en relation directe : Carte de contact du Loueur (Appel & WhatsApp 1-clic) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Contact direct avec votre loueur pour convenir du retrait :
                </div>
                <CounterpartContactCard
                  counterpartRole="loueur"
                  name={payload.loueur_nom || details.equipment.ownerName || details.equipment.partnerArtisan || 'Loueur partenaire'}
                  phone={payload.loueur_telephone || details.equipment.ownerPhone || ''}
                  email={payload.loueur_email || details.equipment.ownerEmail || ''}
                  equipmentName={details.equipment.name}
                />
              </div>

              {/* Step-by-Step Flow */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Prochaines étapes pour retirer votre matériel :
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs">
                      1
                    </div>
                    <div className="font-bold text-slate-900 text-sm">Signature du contrat</div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Cliquez sur le lien reçu par e-mail pour parapher électroniquement le contrat de mise à disposition.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs">
                      2
                    </div>
                    <div className="font-bold text-slate-900 text-sm">Empreinte Stripe {details.montantCaution} €</div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Renseignez votre carte sans aucun débit immédiat pour sécuriser la caution fixée par le loueur.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs">
                      3
                    </div>
                    <div className="font-bold text-slate-900 text-sm">Retrait chez le loueur</div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Présentez votre QR code de confirmation auprès de {payload.artisan_nom}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stripe' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">Empreinte bancaire Stripe</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    En attente d'autorisation
                  </span>
                </div>

                <div className="space-y-3 text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Montant de la caution retenue (loueur) :</span>
                    <span className="text-lg font-mono font-black text-slate-950 tabular-nums">{details.montantCaution},00 €</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Impact sur votre solde bancaire :</span>
                    <span className="font-bold text-emerald-600">0,00 € (Aucun débit)</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Protocole de sécurité :</span>
                    <span className="text-slate-800 font-mono font-medium">Stripe Hold API & 3D Secure v2</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Restitution de l'empreinte :</span>
                    <span className="text-slate-800 font-medium">Automatique sous 24h après le retour</span>
                  </div>
                </div>

                {details.stripeCheckoutUrl ? (
                  <div className="pt-2">
                    <a
                      href={details.stripeCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Valider mon empreinte de caution sur Stripe ({details.montantCaution} €)</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                    <p className="text-[10px] text-center text-slate-500 mt-1.5">
                      Redirection vers la page sécurisée 3D-Secure Stripe (aucun débit immédiat).
                    </p>
                  </div>
                ) : null}

                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Le lien de paiement Stripe pré-rempli pour votre compte ({details.clientEmail}) vous a été transmis
                    par notification directe et par e-mail.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'receipt' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-slate-950 text-sm">Récépissé Officiel de Réservation</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Imprimer / PDF</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-500 text-[11px] font-mono border-b border-slate-100 pb-2">
                    <span>DOCUMENT OFFICIEL MATIK</span>
                    <span className="text-emerald-700 font-bold">✓ CERTIFIÉ CONFORME</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Locataire</span>
                      <strong className="text-slate-900">{details.clientPrenom} {details.clientNom}</strong>
                      <div className="text-[11px] text-slate-500">{details.clientEmail}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Loueur partenaire</span>
                      <strong className="text-slate-900">{payload.artisan_nom}</strong>
                      <div className="text-[11px] text-slate-500">Dépôt vérifié Matik</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Période</span>
                      <span className="font-mono text-slate-900 font-semibold">{details.startDate}</span>
                      <div className="text-[10px] text-slate-500">au {details.endDate} ({details.dureeJours}j)</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Frais Matik (10%)</span>
                      <span className="font-mono text-amber-800 font-bold text-sm">
                        +{(details.fraisService ?? Math.round((details.totalLocation / 1.1) * 0.10 * 100) / 100).toFixed(2).replace('.00', '')} €
                      </span>
                      <div className="text-[10px] text-slate-500">Service & Garantie</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total réglé</span>
                      <span className="font-mono text-slate-900 font-bold text-sm">{details.totalLocation} € TTC</span>
                      <div className="text-[10px] text-slate-500">Sous-total + Frais 10%</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Caution Stripe</span>
                      <span className="font-mono text-amber-700 font-bold text-sm">{details.montantCaution} €</span>
                      <div className="text-[10px] text-emerald-600 font-medium">Non débitée (0 €)</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Caution Stripe non débitée : <strong>{details.montantCaution} €</strong>. Simple empreinte bancaire libérée à la restitution.</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Recap of the rental */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600 space-y-1">
              <div>
                Matériel : <strong className="text-slate-900 font-bold">{details.equipment.name}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-slate-600">
                <span>Durée : <strong className="text-slate-900 font-mono font-semibold">{details.dureeJours} jours</strong></span>
                <span>•</span>
                <span>Frais de service & garantie Matik (10%) : <strong className="text-amber-700 font-mono font-semibold">+{(details.fraisService ?? Math.round((details.totalLocation / 1.1) * 0.10 * 100) / 100).toFixed(2).replace('.00', '')} €</strong></span>
              </div>
              <div className="pt-0.5">
                Total final : <strong className="text-slate-950 font-mono font-bold text-sm">{details.totalLocation} € TTC</strong>
                <span className="text-slate-400 mx-2">·</span>
                <span className="text-emerald-700 font-bold">Caution Stripe non débitée : {details.montantCaution} €</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20 cursor-pointer"
              >
                Compris & Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
