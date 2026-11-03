import React, { useState, useEffect } from 'react';
import { Equipment, BookingPayload, CurrentUser, ClientProfile, BookingRecord } from '../types';
import { submitBooking } from '../services/booking';
import { getEquipmentAvailability } from '../utils/availability';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CreditCard,
  Send,
  User,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Zap,
  Lock,
} from 'lucide-react';

interface BookingFormProps {
  equipmentList: Equipment[];
  selectedEquipment: Equipment;
  bookingList?: BookingRecord[];
  onSelectEquipment: (equipment: Equipment) => void;
  onBookingSuccess: (payload: BookingPayload, fullDetails: {
    equipment: Equipment;
    clientPrenom: string;
    clientNom: string;
    clientEmail: string;
    clientTelephone?: string;
    startDate: string;
    endDate: string;
    sousTotal: number;
    fraisService: number;
    totalLocation: number;
    montantCaution: number;
    dureeJours: number;
    networkStatus: 'success' | 'cors_fallback' | 'simulated';
    stripeCheckoutUrl?: string | null;
    contractPdfBase64?: string;
    contractFilename?: string;
    emailDeliveryStatus?: {
      clientSent: boolean;
      loueurSent: boolean;
      errors?: string[];
    };
  }) => void;
  currentUser?: CurrentUser;
  onOpenAuthModal?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  equipmentList,
  selectedEquipment,
  bookingList = [],
  onSelectEquipment,
  onBookingSuccess,
  currentUser,
  onOpenAuthModal,
}) => {
  // Today's date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // Extraction intelligente des coordonnées de la session active
  const getInitialPrenom = () => {
    if (!currentUser) return '';
    if ('prenom' in currentUser && currentUser.prenom) return currentUser.prenom;
    if ('name' in currentUser && currentUser.name) return currentUser.name.split(' ')[0] || '';
    return '';
  };

  const getInitialNom = () => {
    if (!currentUser) return '';
    if ('nom' in currentUser && currentUser.nom) return currentUser.nom;
    if ('name' in currentUser && currentUser.name) {
      const parts = currentUser.name.split(' ');
      return parts.slice(1).join(' ') || '';
    }
    return '';
  };

  const [clientPrenom, setClientPrenom] = useState(getInitialPrenom);
  const [clientNom, setClientNom] = useState(getInitialNom);
  const [clientEmail, setClientEmail] = useState(currentUser?.email || '');
  const [clientTelephone, setClientTelephone] = useState(currentUser?.phone || '');
  const [artisanNom, setArtisanNom] = useState(selectedEquipment.partnerArtisan);
  const [dureeJours, setDureeJours] = useState<number>(3);
  const [startDate, setStartDate] = useState<string>(today);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-remplissage dynamique dès que la session utilisateur change
  useEffect(() => {
    if (currentUser) {
      const p = 'prenom' in currentUser && currentUser.prenom ? currentUser.prenom : currentUser.name?.split(' ')[0] || '';
      const n = 'nom' in currentUser && currentUser.nom ? currentUser.nom : currentUser.name?.split(' ').slice(1).join(' ') || '';
      setClientPrenom(p);
      setClientNom(n);
      setClientEmail(currentUser.email || '');
      setClientTelephone(currentUser.phone || '');
    }
  }, [currentUser]);

  // Sync artisan when selected equipment changes
  useEffect(() => {
    setArtisanNom(selectedEquipment.partnerArtisan);
  }, [selectedEquipment]);

  // Commission Matik 10% & caution calculations (calculs précis conformes au panier)
  const montantCaution = Number(selectedEquipment.depositAmount) || 0;
  const sousTotal = Math.round((Number(selectedEquipment.dailyRate) * Number(dureeJours)) * 100) / 100;
  const fraisService = Math.round((sousTotal * 0.10) * 100) / 100; // Frais de service et garantie Matik (10%)
  const totalLocation = Math.round((sousTotal + fraisService) * 100) / 100; // Total final TTC réglé par le client

  // Disponibilité en temps réel de l'équipement sélectionné
  const availability = getEquipmentAvailability(selectedEquipment, bookingList);

  // Calculate end date based on start date and duration
  const calculateEndDate = () => {
    try {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return startDate;
      const end = new Date(start);
      end.setDate(start.getDate() + Math.max(1, dureeJours));
      return end.toISOString().split('T')[0];
    } catch {
      return startDate;
    }
  };

  const endDate = calculateEndDate();

  /**
   * handleSubmit : validation et transmission vers l'API backend Matik
   * Transmet coordonnées, équipement, dates, total, commission 10% et caution Stripe
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Blocage si l'équipement est actuellement loué
    if (availability.isRented) {
      setSubmitError(
        `Cet équipement est actuellement loué jusqu'au ${availability.formattedEndDate}. Vous ne pouvez pas effectuer de nouvelle réservation pour le moment.`
      );
      return;
    }

    setIsSubmitting(true);

    const fullClientNom = `${clientPrenom} ${clientNom}`.trim();

    // Calculs de tarification sécurisés et strictement synchronisés avec le récapitulatif du panier
    const finalSousTotal = Math.round((Number(selectedEquipment.dailyRate) * Math.max(1, Number(dureeJours))) * 100) / 100;
    const finalFraisService = Math.round((finalSousTotal * 0.10) * 100) / 100; // 10% de frais de service
    const finalTotalLocation = Math.round((finalSousTotal + finalFraisService) * 100) / 100; // Total TTC final payé par le client
    const finalMontantCaution = Number(selectedEquipment.depositAmount) || 0;

    try {
      console.log('📝 [BookingForm] Soumission du formulaire de réservation par le client :', {
        client: fullClientNom,
        email: clientEmail,
        telephone: clientTelephone,
        materiel: selectedEquipment.name,
        duree: `${dureeJours} jours (${startDate} au ${endDate})`,
        totalLocation: `${finalTotalLocation} €`,
        caution: `${finalMontantCaution} €`,
      });

      // Appel de l'API backend Matik (PDF + Email + Stripe)
      const result = await submitBooking(
        {
          clientPrenom: clientPrenom.trim(),
          clientNom: clientNom.trim(),
          clientEmail: clientEmail.trim(),
          clientTelephone: clientTelephone.trim(),
          equipmentId: selectedEquipment.id,
          nomMatiere: selectedEquipment.name,
          categorie: selectedEquipment.category,
          artisanNom: artisanNom || selectedEquipment.partnerArtisan,
          ownerId: selectedEquipment.ownerId,
          loueurNom: selectedEquipment.ownerName || selectedEquipment.partnerArtisan,
          loueurEmail: selectedEquipment.ownerEmail,
          loueurTelephone: selectedEquipment.ownerPhone,
          startDate,
          endDate,
          dureeJours: Math.max(1, Number(dureeJours)),
          prixJournalier: Number(selectedEquipment.dailyRate) || 0,
          sousTotal: finalSousTotal,
          fraisService: finalFraisService,
          totalLocation: finalTotalLocation,
          montantCaution: finalMontantCaution,
        },
      );

      console.log('📋 [BookingForm] Résultat retourné par l\'API Matik :', result);

      if (!result.success && result.status === 'error') {
        console.error('❌ [BookingForm] Échec du traitement de la réservation :', result.message);
        setSubmitError(result.message || 'Le serveur n\'a pas pu valider votre réservation. Veuillez réessayer.');
        return;
      }

      // Si aucune session n'est encore active, sauvegarder les coordonnées pour les réservations futures
      if (!currentUser && clientPrenom.trim() && clientNom.trim() && clientEmail.trim()) {
        const autoClient: ClientProfile = {
          id: `client-${Date.now()}`,
          role: 'client',
          prenom: clientPrenom.trim(),
          nom: clientNom.trim(),
          name: fullClientNom,
          email: clientEmail.trim(),
          phone: clientTelephone.trim(),
        };
        try {
          localStorage.setItem('matik_user_session', JSON.stringify(autoClient));
          localStorage.setItem('matik_user', JSON.stringify(autoClient));
        } catch {}
      }

      // Déclenche le flux de confirmation utilisateur avec tous les détails
      onBookingSuccess(result.payload, {
        equipment: selectedEquipment,
        clientPrenom,
        clientNom,
        clientEmail,
        clientTelephone,
        startDate,
        endDate,
        sousTotal: finalSousTotal,
        fraisService: finalFraisService,
        totalLocation: finalTotalLocation,
        montantCaution: finalMontantCaution,
        dureeJours: Math.max(1, Number(dureeJours)),
        networkStatus: result.status === 'error' ? 'cors_fallback' : 'success',
        stripeCheckoutUrl: result.stripeCheckoutUrl,
        contractPdfBase64: result.contract?.pdfBase64,
        contractFilename: result.contract?.filename,
        emailDeliveryStatus: result.email,
      });
    } catch (err: unknown) {
      console.error('[BookingForm] Erreur lors de la soumission de la réservation :', err);
      setSubmitError('Une erreur inattendue est survenue. Veuillez vérifier votre connexion et réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="reservation" className="py-16 lg:py-24 bg-white border-b border-slate-200/80 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-semibold">
            Formulaire de Réservation Instantané
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
            Réservez votre équipement en 3 clics
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Contrat généré immédiatement, envoi direct par e-mail et empreinte de caution Stripe 100% sécurisée.
          </p>
        </div>

        {/* Booking Container: Form + Dynamic Cost Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): The interactive Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Vos coordonnées de location</h3>
                <p className="text-xs text-slate-500">Utilisées pour la rédaction automatique de votre contrat légal</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Contrat & caution certifiés
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Alerte si le matériel est actuellement loué */}
              {availability.isRented && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold uppercase tracking-wider text-rose-800 text-[11px] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      Matériel actuellement indisponible à la location
                    </span>
                    <p className="leading-relaxed text-rose-700">
                      « <strong>{selectedEquipment.name}</strong> » fait actuellement l'objet d'une réservation active jusqu'au{' '}
                      <strong>{availability.formattedEndDate}</strong>. La validation de réservation est désactivée tant que la période de location en cours n'est pas terminée.
                    </p>
                  </div>
                </div>
              )}

              {/* Auto-remplissage notification banner */}
              {currentUser ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">
                        Session active ({currentUser.role === 'loueur_pro' ? currentUser.companyName : `${clientPrenom} ${clientNom}`.trim() || currentUser.email}) :
                      </span>{' '}
                      Vos coordonnées sont pré-remplies automatiquement.
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                    Auto-rempli
                  </span>
                </div>
              ) : onOpenAuthModal ? (
                <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Déjà inscrit ? Connectez-vous pour pré-remplir instantanément vos coordonnées.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="text-xs font-bold text-amber-900 hover:text-amber-700 underline cursor-pointer shrink-0"
                  >
                    Connexion 1-clic
                  </button>
                </div>
              ) : null}

              {/* Client Name Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="clientPrenom" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Prénom
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="clientPrenom"
                      type="text"
                      required
                      value={clientPrenom}
                      onChange={(e) => setClientPrenom(e.target.value)}
                      placeholder="Alexandre"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="clientNom" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Nom de famille
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="clientNom"
                      type="text"
                      required
                      value={clientNom}
                      onChange={(e) => setClientNom(e.target.value)}
                      placeholder="Martin"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="clientEmail" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Adresse e-mail (Réception contrat)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="clientEmail"
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="alexandre@entreprise.fr"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Le contrat PDF et le lien Stripe sécurisé y seront adressés.
                  </span>
                </div>

                <div className="space-y-2">
                  <label htmlFor="clientTelephone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Numéro de mobile
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="clientTelephone"
                      type="tel"
                      value={clientTelephone}
                      onChange={(e) => setClientTelephone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Pour le SMS de mise à disposition en agence.
                  </span>
                </div>
              </div>

              {/* Equipment Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label htmlFor="equipmentSelect" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Matériel sélectionné (<span className="text-amber-700 font-mono">nom_matiere</span>)
                </label>
                <select
                  id="equipmentSelect"
                  value={selectedEquipment.id}
                  onChange={(e) => {
                    const found = equipmentList.find((item) => item.id === e.target.value);
                    if (found) onSelectEquipment(found);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
                >
                  {equipmentList.map((item) => {
                    const itemAvail = getEquipmentAvailability(item, bookingList);
                    return (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.dailyRate} € / jour (Caution : {item.depositAmount} €)
                        {itemAvail.isRented ? ` [LOUÉ jusqu'au ${itemAvail.formattedEndDate}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Artisan / Partner / Point de retrait */}
              <div className="space-y-2">
                <label htmlFor="artisanSelect" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Point de retrait / Propriétaire (<span className="text-amber-700 font-mono">artisan_nom</span>)
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="artisanSelect"
                    type="text"
                    value={artisanNom}
                    onChange={(e) => setArtisanNom(e.target.value)}
                    placeholder="Nom du loueur ou adresse de remise"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* Dates & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="space-y-2">
                  <label htmlFor="startDate" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Date de début de location
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="startDate"
                      type="date"
                      required
                      value={startDate}
                      min={today}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="dureeJours" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Durée de location (<span className="text-amber-700 font-mono">duree_jours</span>)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDureeJours((prev) => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center bg-slate-50 border border-slate-200 rounded-lg py-2 text-sm font-mono font-bold text-slate-900 tabular-nums">
                      {dureeJours} {dureeJours > 1 ? 'jours' : 'jour'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDureeJours((prev) => prev + 1)}
                      className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Message d'erreur éventuel */}
              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || availability.isRented}
                  className={`w-full py-4 px-6 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${
                    availability.isRented
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none select-none'
                      : 'text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-99 disabled:opacity-75 disabled:cursor-not-allowed shadow-md shadow-amber-400/25 cursor-pointer'
                  }`}
                >
                  {availability.isRented ? (
                    <>
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Matériel actuellement loué · Réservation indisponible</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Génération du contrat et sécurisation Stripe en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Valider ma réservation & générer mon contrat</span>
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-xs text-slate-500">
                  En validant, votre contrat de location certifié et votre lien d'empreinte Stripe sont générés instantanément.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column (5 cols): Dynamic Cost Breakdown & Stripe Hold details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-950">Récapitulatif dynamique des coûts</h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  Devis instantané
                </span>
              </div>

              {/* Selected Equipment Snapshot */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={selectedEquipment.image}
                  alt={selectedEquipment.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
                />
                <div className="overflow-hidden space-y-1">
                  <div className="text-xs text-amber-700 font-semibold uppercase tracking-wider truncate">
                    {selectedEquipment.category}
                  </div>
                  <div className="text-sm font-bold text-slate-950 leading-tight truncate">
                    {selectedEquipment.name}
                  </div>
                  <div className="text-xs text-slate-600 font-mono tabular-nums">
                    {selectedEquipment.dailyRate} € / jour
                  </div>
                </div>
              </div>

              {/* Dates & Timeline recap */}
              <div className="text-xs space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Période réservée :</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {startDate} au {endDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Durée comptabilisée :</span>
                  <span className="font-bold text-amber-700 font-mono">{dureeJours} jours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lieu de retrait :</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[200px]">{artisanNom}</span>
                </div>
              </div>

              {/* Financial calculations breakdown */}
              <div className="space-y-3 pt-3 border-t border-slate-200 text-sm">
                <div className="flex justify-between items-center text-slate-700">
                  <span>
                    Location matériel ({selectedEquipment.dailyRate} € × {dureeJours} {dureeJours > 1 ? 'jours' : 'jour'})
                  </span>
                  <span className="font-mono font-bold text-slate-950 tabular-nums">{sousTotal} €</span>
                </div>

                {/* Ligne obligatoire : Frais de service & garantie Matik (10%) */}
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-950">
                  <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Frais de service & garantie Matik (10%)</span>
                  </div>
                  <span className="font-mono font-bold tabular-nums">
                    +{fraisService.toFixed(2).replace('.00', '')} €
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700 text-xs">
                  <span>Assurance casse & vol professionnelle</span>
                  <span className="font-mono text-emerald-700 font-bold">Incluse (0 €)</span>
                </div>

                <div className="flex justify-between items-center text-slate-700 text-xs">
                  <span>Édition automatique du contrat & signature</span>
                  <span className="font-mono text-emerald-700 font-bold">Offerte</span>
                </div>

                {/* Total final à payer */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Total à payer par le client
                    </span>
                    <p className="text-[11px] text-slate-500">Location ({sousTotal} €) + Frais de service 10% ({fraisService} €)</p>
                  </div>
                  <div className="text-2xl font-black text-slate-950 font-mono tabular-nums">
                    {totalLocation.toFixed(2).replace('.00', '')} € <span className="text-xs font-normal text-slate-500">TTC</span>
                  </div>
                </div>

                {/* Précision sous le total : Caution Stripe non débitée : X € */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span>Caution Stripe non débitée : {montantCaution} €</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      0 € DÉBITÉ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Caution Stripe non débitée : <strong className="text-slate-950 font-mono">{montantCaution} €</strong>.
                    Simple empreinte bancaire sécurisée sans aucun prélèvement sur votre compte, automatiquement relâchée lors de la restitution.
                  </p>
                </div>
              </div>

              {/* Safety bullet reassurance */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-3 text-xs text-slate-600">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Paiement sécurisé par protocole 3D Secure v2 & chiffrement bancaire Stripe.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
