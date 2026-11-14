import { BookingPayload } from '../types';

/**
 * Interface des données de réservation transmises à l'API Matik interne.
 */
export interface BookingSubmissionData {
  // Coordonnées du client
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone: string;

  // Détails de l'équipement et propriétaire
  equipmentId?: string;
  nomMatiere: string;
  equipmentName?: string;
  categorie?: string;
  equipmentCategory?: string;
  artisanNom: string;
  ownerId?: string;
  loueurNom?: string;
  loueurEmail?: string;
  loueurTelephone?: string;
  loueurStripeAccountId?: string;
  stripeAccountId?: string;

  // Dates et durée
  startDate: string;
  endDate: string;
  dureeJours: number;

  // Tarification et caution Stripe
  prixJournalier?: number;
  sousTotal: number;
  fraisService: number;
  totalLocation: number;
  montantCaution: number;

  // Métadonnées
  timestamp?: string;
}

/**
 * Résultat de l'appel à l'API de réservation Matik
 */
export interface BookingResult {
  success: boolean;
  status: 'success' | 'error';
  httpStatus?: number;
  message: string;
  bookingId?: string;
  payload: BookingPayload;
  stripeCheckoutUrl?: string | null;
  stripePaymentUrl?: string | null;
  stripeCautionUrl?: string | null;
  contract?: {
    generated: boolean;
    sizeBytes: number;
    filename?: string;
    pdfBase64?: string;
  };
  email?: {
    clientSent: boolean;
    clientMessageId?: string | null;
    loueurSent: boolean;
    loueurMessageId?: string | null;
    errors?: string[];
  };
}

/**
 * Récupère l'URL de base de l'API backend Matik.
 * En développement local : proxy Vite → http://localhost:3001
 * En production : même domaine /api
 */
function getApiBaseUrl(): string {
  // En dev, Vite proxifie /api vers le serveur Express
  // En production, l'API est servie depuis le même domaine
  return '/api';
}

/**
 * Envoie la réservation à l'API Matik interne (POST /api/booking).
 *
 * L'API backend gère directement :
 *   1. Génération du contrat PDF
 *   2. Envoi des e-mails de confirmation (client + loueur) avec contrat en PJ
 *   3. Création de la session Stripe Checkout pour l'empreinte de caution
 */
export async function submitBooking(bookingData: BookingSubmissionData): Promise<BookingResult> {
  const apiUrl = `${getApiBaseUrl()}/booking`;
  const fullClientNom = `${bookingData.clientPrenom} ${bookingData.clientNom}`.trim();

  const safeSousTotal = Math.round((Number(bookingData.sousTotal) || 0) * 100) / 100;
  const safeFraisService = Math.round((Number(bookingData.fraisService) || 0) * 100) / 100;
  const safeTotalLocation = Math.round((Number(bookingData.totalLocation) || (safeSousTotal + safeFraisService)) * 100) / 100;
  const safeMontantCaution = Math.round((Number(bookingData.montantCaution) || 0) * 100) / 100;

  const loueurNom = (bookingData.loueurNom || bookingData.artisanNom || '').trim();
  const loueurEmail = (bookingData.loueurEmail || '').trim();
  const loueurTelephone = (bookingData.loueurTelephone || '').trim();

  // Corps de la requête envoyée à l'API backend
  const requestBody = {
    clientPrenom: bookingData.clientPrenom.trim(),
    clientNom: bookingData.clientNom.trim(),
    clientEmail: bookingData.clientEmail.trim(),
    clientTelephone: (bookingData.clientTelephone || '').trim(),
    equipmentId: bookingData.equipmentId || '',
    equipmentName: bookingData.nomMatiere || bookingData.equipmentName || '',
    nomMatiere: bookingData.nomMatiere,
    equipmentCategory: bookingData.categorie || bookingData.equipmentCategory || '',
    categorie: bookingData.categorie || '',
    artisanNom: bookingData.artisanNom,
    ownerId: bookingData.ownerId || '',
    loueurNom,
    loueurEmail,
    loueurTelephone,
    loueurStripeAccountId: bookingData.loueurStripeAccountId || bookingData.stripeAccountId || '',
    stripeAccountId: bookingData.stripeAccountId || bookingData.loueurStripeAccountId || '',
    startDate: bookingData.startDate,
    endDate: bookingData.endDate,
    dureeJours: Math.max(1, Number(bookingData.dureeJours)),
    prixJournalier: Number(bookingData.prixJournalier) || 0,
    sousTotal: safeSousTotal,
    fraisService: safeFraisService,
    totalLocation: safeTotalLocation,
    montantCaution: safeMontantCaution,
    timestamp: bookingData.timestamp || new Date().toISOString(),
    source_application: 'Matik Web Platform v4',
  };

  // Payload de réservation standard
  const fallbackPayload: BookingPayload = {
    client_nom: fullClientNom,
    client_email: bookingData.clientEmail.trim(),
    artisan_nom: loueurNom || bookingData.artisanNom,
    nom_matiere: bookingData.nomMatiere,
    duree_jours: Number(bookingData.dureeJours),
    sous_total: safeSousTotal,
    frais_service: safeFraisService,
    total_location: safeTotalLocation,
    montant_caution: safeMontantCaution,
    date_debut: bookingData.startDate,
    date_fin: bookingData.endDate,
    timestamp: requestBody.timestamp,
    loueur_nom: loueurNom,
    loueur_email: loueurEmail,
    loueur_telephone: loueurTelephone,
    artisan_email: loueurEmail,
    artisan_telephone: loueurTelephone,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    console.group('🚀 [Matik API] Envoi de la réservation');
    console.log('📍 URL cible :', apiUrl);
    console.log('📦 Corps de la requête :', requestBody);
    console.groupEnd();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    console.group(`📡 [Matik API] Réponse HTTP : ${response.status}`);
    console.log('📨 Données :', responseData);
    console.groupEnd();

    if (!response.ok) {
      return {
        success: false,
        status: 'error',
        httpStatus: response.status,
        message: responseData?.error || `Erreur serveur (HTTP ${response.status})`,
        payload: fallbackPayload,
      };
    }

    return {
      success: true,
      status: 'success',
      httpStatus: response.status,
      message: responseData?.message || 'Réservation traitée avec succès',
      bookingId: responseData?.bookingId,
      payload: responseData?.payload || fallbackPayload,
      stripeCheckoutUrl: responseData?.stripe?.checkoutUrl || null,
      stripePaymentUrl: responseData?.stripe?.paymentCheckoutUrl || responseData?.stripe?.checkoutUrl || null,
      stripeCautionUrl: responseData?.stripe?.cautionCheckoutUrl || null,
      contract: responseData?.contract,
      email: responseData?.email,
    };
  } catch (err: unknown) {
    console.error('❌ [Matik API] Erreur :', err);

    return {
      success: false,
      status: 'error',
      message: err instanceof Error ? err.message : 'Erreur de connexion au serveur',
      payload: fallbackPayload,
    };
  }
}

/**
 * Déclenche l'envoi de l'e-mail récapitulatif avec contrat PDF une fois le paiement et la caution confirmés.
 */
export async function sendConfirmationEmailAfterValidation(params: {
  bookingId: string;
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone?: string;
  loueurNom?: string;
  loueurEmail?: string;
  loueurTelephone?: string;
  equipmentName: string;
  equipmentCategory?: string;
  startDate: string;
  endDate: string;
  dureeJours: number;
  sousTotal: number;
  fraisService: number;
  totalLocation: number;
  montantCaution: number;
  pdfBase64?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = `${getApiBaseUrl()}/booking`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_confirmation_email',
        ...params,
      }),
    });
    const data = await res.json();
    return { success: !!data.success, error: data.error };
  } catch (e: any) {
    console.error('❌ [sendConfirmationEmailAfterValidation Error]', e);
    return { success: false, error: e?.message };
  }
}
