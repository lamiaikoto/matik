export interface Equipment {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  depositAmount: number; // Caution fixée par le loueur
  image: string;
  /** Galerie courte : 2 photos maximum (photos[0] = image principal). */
  photos?: string[];
  description: string;
  specs: {
    label: string;
    value: string;
  }[];
  partnerArtisan: string;
  city?: string;
  postalCode?: string;
  region?: string;
  condition?: 'neuf' | 'tres_bon_etat' | 'bon_etat';
  tags?: string[];
  inStock: boolean;
  isActive?: boolean;
  is_published?: boolean;
  ownerType?: 'pro' | 'particulier';
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  createdAt?: string;
}

export type UserRole = 'loueur_pro' | 'loueur_particulier' | 'client';

export interface LoueurProProfile {
  id: string;
  role: 'loueur_pro';
  name: string; // Nom du contact ou responsable
  displayName?: string; // Pseudo ou nom public affiché sur les annonces et menus
  prenom?: string;
  nom?: string;
  companyName: string;
  siret: string;
  email: string;
  phone: string;
  city?: string;
  stripeConnectAccountId?: string;
}

export interface LoueurParticulierProfile {
  id: string;
  role: 'loueur_particulier';
  prenom: string;
  nom: string;
  name?: string;
  displayName?: string; // Pseudo ou nom public affiché sur les annonces et menus
  email: string;
  phone: string;
  city: string;
  stripeConnectAccountId?: string;
}

export interface ClientProfile {
  id: string;
  role: 'client';
  name: string;
  displayName?: string; // Pseudo ou nom public affiché sur les annonces et menus
  prenom?: string;
  nom?: string;
  email: string;
  phone: string;
  city?: string;
  stripeConnectAccountId?: string;
}

export type CurrentUser = LoueurProProfile | LoueurParticulierProfile | ClientProfile | null;

export type PageType =
  | 'accueil'
  | 'catalogue'
  | 'espace-loueur'
  | 'garanties'
  | 'etat-des-lieux'
  | 'mentions-legales'
  | 'cgu'
  | 'confidentialite';

export interface BookingFormData {
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone: string;
  nomMatiere: string;
  artisanNom: string;
  dureeJours: number;
  startDate: string;
}

export interface BookingPayload {
  client_nom: string;
  client_email: string;
  artisan_nom: string;
  nom_matiere: string;
  duree_jours: number;
  sous_total?: number;
  frais_service?: number;
  total_location: number;
  montant_caution: number;
  date_debut?: string;
  date_fin?: string;
  timestamp?: string;
  loueur_nom?: string;
  loueur_email?: string;
  loueur_telephone?: string;
  artisan_email?: string;
  artisan_telephone?: string;
}

export interface BookingConfirmation {
  id: string;
  payload: BookingPayload;
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  equipment: Equipment;
  startDate: string;
  endDate: string;
  dureeJours: number;
  sousTotal?: number;
  fraisService?: number;
  totalLocation: number;
  montantCaution: number;
  status: 'sent' | 'pending_stripe_hold';
}

export interface InspectionReport {
  id: string;
  bookingId: string;
  type: 'check_in' | 'check_out';
  submittedBy?: 'client' | 'loueur';
  timestamp: string;
  photos: string[];
  cleanliness: 'impeccable' | 'correct' | 'a_nettoyer';
  functionalStatus: 'conforme' | 'remarque';
  notes: string;
  validatedByOwner: boolean;
  validatedByTenant: boolean;
  cautionReleased?: boolean;
}

export interface BookingRecord {
  id: string;
  bookingId?: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCategory: string;
  equipmentImage: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  /** Identité Supabase (auth.users.id) du locataire — utilisée par la RLS. */
  locataireId?: string;
  /** Identité Supabase (auth.users.id) du loueur — utilisée par la RLS. */
  loueurId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startDate: string;
  endDate: string;
  days: number;
  sousTotal?: number;
  fraisService?: number;
  totalPrice: number;
  cautionAmount: number;
  status: 'pending_payment' | 'en_attente_remise' | 'en_cours' | 'restitution_signalee' | 'restitue';
  restitutionSignaledAt?: string;
  stripeCautionStatus: 'sequestre_sans_debit' | 'caution_liberee' | 'litige_bloque';
  stripePaymentIntentId?: string;
  stripeCautionPaymentIntentId?: string;
  stripeCautionSessionId?: string;
  stripeCautionUrl?: string;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  cautionAuthorizedAt?: string;
  cautionRenewalFailed?: boolean;
  cautionRenewalError?: string;
  lastCautionRenewalAt?: string;
  renewalCount?: number;
  disputeReason?: string;
  disputedAt?: string;
  paymentConfirmedAt?: string;
  confirmationEmailSentAt?: string;
  createdAt: string;
  checkInReport?: InspectionReport;
  checkOutReport?: InspectionReport;
}

export interface MatikTrustScore {
  rating: number; // ex: 4.9
  reviewCount: number; // ex: 24
  successRate: number; // ex: 100 (% sans litige)
  responseTimeMinutes: number; // ex: 12
  identityVerified: boolean;
}

export interface EquipmentReview {
  id: string;
  equipmentId: string;
  bookingId?: string;
  authorId?: string;
  authorName: string;
  authorRole?: string;
  rating: number; // 1 à 5
  comment: string;
  date: string;
  rentalDuration?: string;
  cautionRestituee?: boolean;
  createdAt?: string;
}

