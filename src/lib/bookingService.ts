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
  client_email: string;
  client_phone: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
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

/** Convertit une ligne PostgreSQL en objet BookingRecord utilisé par l'interface. */
export const mapSupabaseBookingToRecord = (row: SupabaseBookingRow): BookingRecord => ({
  id: row.id,
  bookingId: row.booking_reference || row.id,
  equipmentId: row.equipment_id || '',
  equipmentName: row.equipment_name || '',
  equipmentCategory: row.equipment_category || '',
  equipmentImage: row.equipment_image || '',
  ownerId: row.loueur_id || undefined,
  ownerName: row.owner_name || '',
  ownerEmail: row.owner_email || '',
  ownerPhone: row.owner_phone || '',
  locataireId: row.locataire_id,
  loueurId: row.loueur_id || undefined,
  clientName: row.client_name || '',
  clientEmail: row.client_email || '',
  clientPhone: row.client_phone || '',
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
 * Récupère toutes les réservations visibles par l'utilisateur connecté.
 * La RLS ne renvoie que celles dont il est locataire ou loueur.
 */
export const fetchBookingsForUser = async (): Promise<BookingRecord[]> => {
  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase bookings] Chargement impossible :', error.message);
      return [];
    }

    return (data || []).map((row) => mapSupabaseBookingToRecord(row as SupabaseBookingRow));
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
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`id.eq.${safeRef},booking_reference.eq.${safeRef}`)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn('[Supabase bookings] Réservation introuvable :', error.message);
      return null;
    }

    return mapSupabaseBookingToRecord(data as SupabaseBookingRow);
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
    supabase.from('bookings').insert(row).select().single();

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

    return { success: true, booking: mapSupabaseBookingToRecord(data as SupabaseBookingRow) };
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
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase bookings] Mise à jour refusée :', error.message);
      return { success: false, error: error.message, code: (error as { code?: string }).code };
    }

    return {
      success: true,
      booking: data ? mapSupabaseBookingToRecord(data as SupabaseBookingRow) : undefined,
    };
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
 * Écoute les réservations en temps réel.
 * La RLS est appliquée par Supabase Realtime : le loueur ne reçoit que ses locations.
 */
export const subscribeToBookings = (onChange: () => void): (() => void) => {
  try {
    const channel = supabase
      .channel('public-bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => onChange()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
};
