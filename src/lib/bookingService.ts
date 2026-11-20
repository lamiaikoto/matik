import { supabase } from './supabase';
import { isValidUUID } from './equipmentService';
import { BookingRecord, InspectionReport } from '../types';

/**
 * Structure de la table public.bookings (supabase/migrations/01_bookings_and_reviews.sql)
 * Les identités et les montants sont protégés par RLS et par un trigger d'immuabilité.
 */
export interface SupabaseBookingRow {
  id: string;
  booking_reference: string | null;
  equipment_id: string | null;
  equipment_name: string;
  equipment_category: string;
  equipment_image: string;
  locataire_id: string;
  loueur_id: string | null;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  owner_name: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  start_date: string;
  end_date: string;
  days: number;
  subtotal: number;
  service_fee: number;
  total_price: number;
  caution_amount: number;
  status: BookingRecord['status'];
  restitution_signaled_at: string | null;
  stripe_caution_status: BookingRecord['stripeCautionStatus'];
  stripe_payment_intent_id: string | null;
  stripe_caution_intent_id: string | null;
  stripe_caution_session_id: string | null;
  stripe_caution_url: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  caution_authorized_at: string | null;
  caution_renewal_failed: boolean | null;
  caution_renewal_error: string | null;
  last_caution_renewal_at: string | null;
  renewal_count: number | null;
  dispute_reason: string | null;
  disputed_at: string | null;
  check_in_report: InspectionReport | null;
  check_out_report: InspectionReport | null;
  payment_confirmed_at: string | null;
  confirmation_email_sent_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Champs modifiables après création (les montants et identités sont verrouillés côté base). */
export type BookingUpdate = Partial<
  Pick<
    BookingRecord,
    | 'status'
    | 'stripeCautionStatus'
    | 'restitutionSignaledAt'
    | 'cautionAuthorizedAt'
    | 'stripeCautionPaymentIntentId'
    | 'stripeCautionSessionId'
    | 'stripeCautionUrl'
    | 'stripeCustomerId'
    | 'stripePaymentMethodId'
    | 'cautionRenewalFailed'
    | 'cautionRenewalError'
    | 'lastCautionRenewalAt'
    | 'renewalCount'
    | 'disputeReason'
    | 'disputedAt'
    | 'checkInReport'
    | 'checkOutReport'
    | 'paymentConfirmedAt'
    | 'confirmationEmailSentAt'
  >
>;

const toIsoDate = (value: string): string => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.includes('T') ? value.slice(0, 10) : value;
};

/**
 * Colonnes de `bookings` lisibles par le navigateur.
 *
 * Les coordonnées (client_email, client_phone, owner_email, owner_phone) sont
 * volontairement exclues : la migration 07 retire leur privilège SELECT pour
 * les utilisateurs authentifiés. Elles ne sont accessibles qu'après paiement,
 * via la fonction serveur `get_my_booking_contacts()`.
 */
export const BOOKING_PUBLIC_COLUMNS = [
  'id',
  'booking_reference',
  'equipment_id',
  'equipment_name',
  'equipment_category',
  'equipment_image',
  'locataire_id',
  'loueur_id',
  'client_name',
  'owner_name',
  'start_date',
  'end_date',
  'days',
  'subtotal',
  'service_fee',
  'total_price',
  'caution_amount',
  'status',
  'restitution_signaled_at',
  'stripe_caution_status',
  'stripe_payment_intent_id',
  'stripe_caution_intent_id',
  'stripe_caution_session_id',
  'stripe_caution_url',
  'stripe_customer_id',
  'stripe_payment_method_id',
  'caution_authorized_at',
  'caution_renewal_failed',
  'caution_renewal_error',
  'last_caution_renewal_at',
  'renewal_count',
  'dispute_reason',
  'disputed_at',
  'check_in_report',
  'check_out_report',
  'payment_confirmed_at',
  'confirmation_email_sent_at',
  'created_at',
  'updated_at',
].join(',');

/** Coordonnées renvoyées par `get_my_booking_contacts()` (réservations payées). */
export interface BookingContactsRow {
  booking_id: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
}

type BookingContacts = Pick<
  BookingContactsRow,
  'owner_email' | 'owner_phone' | 'client_email' | 'client_phone'
>;

/** Convertit une ligne PostgreSQL en objet BookingRecord utilisé par l'interface. */
export const mapSupabaseBookingToRecord = (
  row: SupabaseBookingRow,
  contacts?: BookingContacts | null
): BookingRecord => ({
  id: row.id,
  bookingId: row.booking_reference || row.id,
  equipmentId: row.equipment_id || '',
  equipmentName: row.equipment_name || '',
  equipmentCategory: row.equipment_category || '',
  equipmentImage: row.equipment_image || '',
  ownerId: row.loueur_id || undefined,
  ownerName: row.owner_name || '',
  ownerEmail: contacts?.owner_email || row.owner_email || '',
  ownerPhone: contacts?.owner_phone || row.owner_phone || '',
  locataireId: row.locataire_id,
  loueurId: row.loueur_id || undefined,
  clientName: row.client_name || '',
  clientEmail: contacts?.client_email || row.client_email || '',
  clientPhone: contacts?.client_phone || row.client_phone || '',
  startDate: row.start_date,
  endDate: row.end_date,
  days: Number(row.days) || 1,
  sousTotal: Number(row.subtotal) || 0,
  fraisService: Number(row.service_fee) || 0,
  totalPrice: Number(row.total_price) || 0,
  cautionAmount: Number(row.caution_amount) || 0,
  status: row.status,
  restitutionSignaledAt: row.restitution_signaled_at || undefined,
  stripeCautionStatus: row.stripe_caution_status,
  stripePaymentIntentId: row.stripe_payment_intent_id || undefined,
  stripeCautionPaymentIntentId: row.stripe_caution_intent_id || undefined,
  stripeCautionSessionId: row.stripe_caution_session_id || undefined,
  stripeCautionUrl: row.stripe_caution_url || undefined,
  stripeCustomerId: row.stripe_customer_id || undefined,
  stripePaymentMethodId: row.stripe_payment_method_id || undefined,
  cautionAuthorizedAt: row.caution_authorized_at || undefined,
  cautionRenewalFailed: Boolean(row.caution_renewal_failed),
  cautionRenewalError: row.caution_renewal_error || undefined,
  lastCautionRenewalAt: row.last_caution_renewal_at || undefined,
  renewalCount: Number(row.renewal_count) || 0,
  disputeReason: row.dispute_reason || undefined,
  disputedAt: row.disputed_at || undefined,
  checkInReport: row.check_in_report || undefined,
  checkOutReport: row.check_out_report || undefined,
  paymentConfirmedAt: row.payment_confirmed_at || undefined,
  confirmationEmailSentAt: row.confirmation_email_sent_at || undefined,
  createdAt: row.created_at,
});

/**
 * Construit la ligne à insérer. `locataire_id` est TOUJOURS l'utilisateur
 * authentifié côté client (RLS : locataire_id = auth.uid()).
 */
const toInsertRow = (booking: BookingRecord, authUserId: string) => ({
  id: booking.id,
  booking_reference: booking.bookingId || booking.id,
  equipment_id: isValidUUID(booking.equipmentId) ? booking.equipmentId : null,
  equipment_name: booking.equipmentName || '',
  equipment_category: booking.equipmentCategory || '',
  equipment_image: booking.equipmentImage || '',
  locataire_id: authUserId,
  // Le loueur est de toute façon recalculé par le trigger depuis equipments.owner_id
  loueur_id: isValidUUID(booking.ownerId) ? booking.ownerId : null,
  client_name: booking.clientName || '',
  client_email: booking.clientEmail || '',
  client_phone: booking.clientPhone || '',
  owner_name: booking.ownerName || null,
  owner_email: booking.ownerEmail || null,
  owner_phone: booking.ownerPhone || null,
  start_date: toIsoDate(booking.startDate),
  end_date: toIsoDate(booking.endDate),
  days: Math.max(1, Number(booking.days) || 1),
  subtotal: Number(booking.sousTotal) || 0,
  service_fee: Number(booking.fraisService) || 0,
  total_price: Number(booking.totalPrice) || 0,
  caution_amount: Number(booking.cautionAmount) || 0,
  status: booking.status,
  restitution_signaled_at: booking.restitutionSignaledAt || null,
  stripe_caution_status: booking.stripeCautionStatus,
  stripe_payment_intent_id: booking.stripePaymentIntentId || null,
  stripe_caution_intent_id: booking.stripeCautionPaymentIntentId || null,
  stripe_caution_session_id: booking.stripeCautionSessionId || null,
  stripe_caution_url: booking.stripeCautionUrl || null,
  stripe_customer_id: booking.stripeCustomerId || null,
  stripe_payment_method_id: booking.stripePaymentMethodId || null,
  caution_authorized_at: booking.cautionAuthorizedAt || null,
  caution_renewal_failed: Boolean(booking.cautionRenewalFailed),
  caution_renewal_error: booking.cautionRenewalError || null,
  last_caution_renewal_at: booking.lastCautionRenewalAt || null,
  renewal_count: Number(booking.renewalCount) || 0,
  dispute_reason: booking.disputeReason || null,
  disputed_at: booking.disputedAt || null,
  check_in_report: booking.checkInReport || null,
  check_out_report: booking.checkOutReport || null,
  payment_confirmed_at: booking.paymentConfirmedAt || null,
  confirmation_email_sent_at: booking.confirmationEmailSentAt || null,
  created_at: booking.createdAt || new Date().toISOString(),
});

/** Convertit un patch d'interface en colonnes PostgreSQL (ignore les champs undefined). */
const toUpdateRow = (patch: BookingUpdate): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  const set = (column: string, value: unknown) => {
    if (value !== undefined) row[column] = value;
  };

  set('status', patch.status);
  set('stripe_caution_status', patch.stripeCautionStatus);
  set('restitution_signaled_at', patch.restitutionSignaledAt);
  set('caution_authorized_at', patch.cautionAuthorizedAt);
  set('stripe_caution_intent_id', patch.stripeCautionPaymentIntentId);
  set('stripe_caution_session_id', patch.stripeCautionSessionId);
  set('stripe_caution_url', patch.stripeCautionUrl);
  set('stripe_customer_id', patch.stripeCustomerId);
  set('stripe_payment_method_id', patch.stripePaymentMethodId);
  set('caution_renewal_failed', patch.cautionRenewalFailed);
  set('caution_renewal_error', patch.cautionRenewalError);
  set('last_caution_renewal_at', patch.lastCautionRenewalAt);
  set('renewal_count', patch.renewalCount);
  set('dispute_reason', patch.disputeReason);
  set('disputed_at', patch.disputedAt);
  set('check_in_report', patch.checkInReport);
  set('check_out_report', patch.checkOutReport);
  set('payment_confirmed_at', patch.paymentConfirmedAt);
  set('confirmation_email_sent_at', patch.confirmationEmailSentAt);

  return row;
};

const getAuthUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
};

/**
 * Récupère les coordonnées des contreparties pour les réservations payées.
 * La fonction SQL renvoie une ligne vide tant que `payment_confirmed_at` est
 * nul : aucun contact n'est donc exposé avant le paiement.
 */
const fetchBookingContacts = async (): Promise<Map<string, BookingContacts>> => {
  const contacts = new Map<string, BookingContacts>();

  try {
    const { data, error } = await supabase.rpc('get_my_booking_contacts');

    if (error) {
      // Migration 07 non exécutée : on continue sans coordonnées plutôt que de
      // casser l'affichage des réservations.
      console.warn('[Supabase bookings] Coordonnées indisponibles :', error.message);
      return contacts;
    }

    for (const row of (data || []) as BookingContactsRow[]) {
      contacts.set(row.booking_id, {
        owner_email: row.owner_email,
        owner_phone: row.owner_phone,
        client_email: row.client_email,
        client_phone: row.client_phone,
      });
    }
  } catch (err) {
    console.warn('[Supabase bookings] Exception get_my_booking_contacts :', err);
  }

  return contacts;
};

/**
 * Récupère toutes les réservations visibles par l'utilisateur connecté.
 * La RLS ne renvoie que celles dont il est locataire ou loueur.
 */
export const fetchBookingsForUser = async (): Promise<BookingRecord[]> => {
  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const [{ data, error }, contacts] = await Promise.all([
      supabase
        .from('bookings')
        .select(BOOKING_PUBLIC_COLUMNS)
        .order('created_at', { ascending: false }),
      fetchBookingContacts(),
    ]);

    if (error) {
      console.warn('[Supabase bookings] Chargement impossible :', error.message);
      return [];
    }

    return (data || []).map((row) => {
      const booking = row as unknown as SupabaseBookingRow;
      return mapSupabaseBookingToRecord(booking, contacts.get(booking.id));
    });
  } catch (err) {
    console.error('[Supabase bookings] Exception fetchBookingsForUser :', err);
    return [];
  }
};

/** Récupère une réservation par sa référence métier (ex : MAT-…). */
export const fetchBookingById = async (bookingId: string): Promise<BookingRecord | null> => {
  if (!bookingId) return null;

  // Les références Matik sont de la forme MAT-XXXX-YYYY : on neutralise toute
  // syntaxe PostgREST inattendue avant de construire le filtre .or().
  const safeRef = bookingId.replace(/[^A-Za-z0-9_-]/g, '');
  if (!safeRef) return null;

  try {
    const [{ data, error }, contacts] = await Promise.all([
      supabase
        .from('bookings')
        .select(BOOKING_PUBLIC_COLUMNS)
        .or(`id.eq.${safeRef},booking_reference.eq.${safeRef}`)
        .maybeSingle(),
      fetchBookingContacts(),
    ]);

    if (error || !data) {
      if (error) console.warn('[Supabase bookings] Réservation introuvable :', error.message);
      return null;
    }

    const booking = data as unknown as SupabaseBookingRow;
    return mapSupabaseBookingToRecord(booking, contacts.get(booking.id));
  } catch (err) {
    console.error('[Supabase bookings] Exception fetchBookingById :', err);
    return null;
  }
};

export interface BookingWriteResult {
  success: boolean;
  booking?: BookingRecord;
  error?: string;
  code?: string;
}

/** Insère une nouvelle réservation (statut initial `pending_payment`). */
export const insertBookingRecord = async (booking: BookingRecord): Promise<BookingWriteResult> => {
  const userId = await getAuthUserId();
  if (!userId) {
    return { success: false, error: 'AUTH_REQUIRED', code: 'AUTH_REQUIRED' };
  }

  const insert = async (row: ReturnType<typeof toInsertRow>) =>
    supabase.from('bookings').insert(row).select(BOOKING_PUBLIC_COLUMNS).single();

  try {
    let { data, error } = await insert(toInsertRow(booking, userId));

    // 23503 = violation de clé étrangère (annonce supprimée entre-temps) :
    // on conserve la réservation avec un snapshot texte de l'équipement.
    if (error && (error as { code?: string }).code === '23503') {
      const fallback = { ...toInsertRow(booking, userId), equipment_id: null };
      ({ data, error } = await insert(fallback));
    }

    if (error) {
      // 23505 = la réservation existe déjà (double-clic ou reprise après timeout réseau) :
      // on la considère comme enregistrée pour éviter de bloquer la redirection Stripe.
      if ((error as { code?: string }).code === '23505') {
        const existing = await fetchBookingById(booking.id);
        if (existing) return { success: true, booking: existing };
      }

      console.warn('[Supabase bookings] Insertion refusée :', error.message);
      return { success: false, error: error.message, code: (error as { code?: string }).code };
    }

    return {
      success: true,
      booking: mapSupabaseBookingToRecord(data as unknown as SupabaseBookingRow),
    };
  } catch (err) {
    console.error('[Supabase bookings] Exception insertBookingRecord :', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
};

/** Met à jour une réservation (statut, caution, états des lieux, litige). */
export const updateBookingRecord = async (
  bookingId: string,
  patch: BookingUpdate
): Promise<BookingWriteResult> => {
  if (!bookingId) return { success: false, error: 'BOOKING_ID_REQUIRED' };

  const row = toUpdateRow(patch);
  if (Object.keys(row).length === 0) return { success: true };

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update(row)
      .eq('id', bookingId)
      .select(BOOKING_PUBLIC_COLUMNS)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase bookings] Mise à jour refusée :', error.message);
      return { success: false, error: error.message, code: (error as { code?: string }).code };
    }

    // Les coordonnées ne sont pas dans la ligne : on les recharge après paiement
    // pour que l'interface ne les perde pas lors d'un changement de statut.
    const contacts = await fetchBookingContacts();
    const booking = data
      ? mapSupabaseBookingToRecord(
          data as unknown as SupabaseBookingRow,
          contacts.get((data as unknown as SupabaseBookingRow).id)
        )
      : undefined;

    return { success: true, booking };
  } catch (err) {
    console.error('[Supabase bookings] Exception updateBookingRecord :', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
};

/** Supprime une réservation non payée (annulation Stripe). */
export const deleteBookingRecord = async (bookingId: string): Promise<BookingWriteResult> => {
  if (!bookingId) return { success: false, error: 'BOOKING_ID_REQUIRED' };

  try {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (error) {
      console.warn('[Supabase bookings] Suppression refusée :', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[Supabase bookings] Exception deleteBookingRecord :', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
};

/**
 * Rafraîchit les réservations de l'utilisateur à intervalle court.
 *
 * Le flux temps réel sur `bookings` a été retiré par la migration 07 : son
 * payload contient la ligne complète, coordonnées comprises, et contournerait
 * le filtrage des colonnes de contact avant paiement.
 */
export const subscribeToBookings = (onChange: () => void): (() => void) => {
  const interval = window.setInterval(onChange, 15000);

  const onFocus = () => onChange();
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') onChange();
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
};
