import { supabase } from './supabase';
import { isValidUUID } from './equipmentService';
import { mapSupabaseBookingToRecord, SupabaseBookingRow } from './bookingService';
import { BookingRecord, EquipmentReview } from '../types';

/** Structure de la table public.reviews (supabase/migrations/01_bookings_and_reviews.sql) */
export interface SupabaseReviewRow {
  id: string;
  booking_id: string;
  equipment_id: string;
  author_id: string;
  author_name: string;
  author_role: string | null;
  rating: number;
  comment: string;
  rental_duration: string | null;
  caution_restituee: boolean | null;
  created_at: string;
}

export interface RatingSummary {
  /** Moyenne arrondie à une décimale, ou `null` s'il n'y a aucun avis. */
  average: number | null;
  count: number;
}

export const formatReviewDate = (isoDate?: string): string => {
  if (!isoDate) return "Aujourd'hui";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Aujourd'hui";
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const mapSupabaseReviewToRecord = (row: SupabaseReviewRow): EquipmentReview => ({
  id: row.id,
  bookingId: row.booking_id,
  equipmentId: row.equipment_id,
  authorId: row.author_id,
  authorName: row.author_name,
  authorRole: row.author_role || 'Locataire Vérifié',
  rating: Number(row.rating) || 0,
  comment: row.comment,
  date: formatReviewDate(row.created_at),
  rentalDuration: row.rental_duration || undefined,
  cautionRestituee: row.caution_restituee !== false,
  createdAt: row.created_at,
});

/** Avis publics d'un équipement (utilisé par la fiche équipement). */
export const fetchReviewsByEquipment = async (equipmentId: string): Promise<EquipmentReview[]> => {
  if (!isValidUUID(equipmentId)) return [];

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase reviews] Chargement impossible :', error.message);
      return [];
    }

    return (data || []).map((row) => mapSupabaseReviewToRecord(row as SupabaseReviewRow));
  } catch (err) {
    console.error('[Supabase reviews] Exception fetchReviewsByEquipment :', err);
    return [];
  }
};

/** Tous les avis (catalogue) — la lecture est publique. */
export const fetchAllReviews = async (): Promise<EquipmentReview[]> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      console.warn('[Supabase reviews] Chargement du catalogue impossible :', error.message);
      return [];
    }

    return (data || []).map((row) => mapSupabaseReviewToRecord(row as SupabaseReviewRow));
  } catch (err) {
    console.error('[Supabase reviews] Exception fetchAllReviews :', err);
    return [];
  }
};

/**
 * Réservations terminées du locataire connecté pour un équipement donné.
 * Sert à autoriser (et à lier) le dépôt d'un avis conforme à la RLS.
 */
export const fetchCompletedBookingsForEquipment = async (
  equipmentId: string
): Promise<BookingRecord[]> => {
  if (!isValidUUID(equipmentId)) return [];

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('locataire_id', userId)
      .eq('status', 'restitue')
      .order('end_date', { ascending: false });

    if (error) {
      console.warn('[Supabase reviews] Locations terminées indisponibles :', error.message);
      return [];
    }

    return (data || []).map((row) => mapSupabaseBookingToRecord(row as SupabaseBookingRow));
  } catch (err) {
    console.error('[Supabase reviews] Exception fetchCompletedBookingsForEquipment :', err);
    return [];
  }
};

export interface CreateReviewInput {
  bookingId: string;
  equipmentId: string;
  rating: number;
  comment: string;
  authorName: string;
  authorRole?: string;
  rentalDuration?: string;
  cautionRestituee?: boolean;
}

/**
 * Dépose un avis. La RLS vérifie :
 *   author_id = auth.uid()
 *   ET la réservation appartient au locataire ET est au statut « restitue »
 *   ET l'équipement correspond.
 */
export const createReview = async (
  input: CreateReviewInput
): Promise<{ success: boolean; review?: EquipmentReview; error?: string }> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      return { success: false, error: 'Connectez-vous pour publier un avis.' };
    }

    const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 0)));
    const comment = input.comment.trim();
    if (!comment) return { success: false, error: 'Le commentaire est obligatoire.' };

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        booking_id: input.bookingId,
        equipment_id: input.equipmentId,
        author_id: userId,
        author_name: input.authorName.trim() || 'Locataire Matik',
        author_role: input.authorRole || 'Locataire Vérifié',
        rating,
        comment,
        rental_duration: input.rentalDuration || null,
        caution_restituee: input.cautionRestituee !== false,
      })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase reviews] Publication refusée :', error.message);
      // 23505 = un avis existe déjà pour cette location
      return {
        success: false,
        error:
          (error as { code?: string }).code === '23505'
            ? 'Vous avez déjà publié un avis pour cette location.'
            : error.message,
      };
    }

    return { success: true, review: mapSupabaseReviewToRecord(data as SupabaseReviewRow) };
  } catch (err) {
    console.error('[Supabase reviews] Exception createReview :', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
};

/** Moyenne réelle : `null` (et non 5) quand aucun avis n'existe. */
export const computeRatingSummary = (reviews: EquipmentReview[]): RatingSummary => {
  const count = reviews.length;
  if (count === 0) return { average: null, count: 0 };
  const sum = reviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
  return { average: Number((sum / count).toFixed(1)), count };
};

/** Agrégat par équipement pour les cartes du catalogue. */
export const summarizeByEquipment = (
  reviews: EquipmentReview[]
): Record<string, RatingSummary> => {
  const grouped: Record<string, EquipmentReview[]> = {};
  reviews.forEach((review) => {
    if (!review.equipmentId) return;
    if (!grouped[review.equipmentId]) grouped[review.equipmentId] = [];
    grouped[review.equipmentId].push(review);
  });

  const summary: Record<string, RatingSummary> = {};
  Object.entries(grouped).forEach(([equipmentId, list]) => {
    summary[equipmentId] = computeRatingSummary(list);
  });
  return summary;
};

/** Écoute les avis en temps réel (publication instantanée sur toutes les fiches). */
export const subscribeToReviews = (onChange: () => void): (() => void) => {
  try {
    const channel = supabase
      .channel('public-reviews-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
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
