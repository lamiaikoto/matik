import React, { useEffect, useMemo, useState } from 'react';
import {
  Star,
  CheckCircle2,
  ShieldCheck,
  Send,
  MessageSquare,
  User,
  Clock,
  Lock,
  Loader2,
} from 'lucide-react';
import { EquipmentReview, CurrentUser, BookingRecord } from '../types';
import {
  fetchReviewsByEquipment,
  fetchCompletedBookingsForEquipment,
  createReview,
  computeRatingSummary,
  subscribeToReviews,
} from '../lib/reviewService';
import { supabase } from '../lib/supabase';
import { buildPublicDisplayNameSuggestion } from '../lib/publicIdentity';

interface ReviewSystemProps {
  equipmentId: string;
  equipmentName: string;
  currentUser?: CurrentUser;
  onReviewAdded?: (newReview: EquipmentReview) => void;
}

export const ReviewSystem: React.FC<ReviewSystemProps> = ({
  equipmentId,
  equipmentName,
  currentUser,
  onReviewAdded,
}) => {
  const [reviews, setReviews] = useState<EquipmentReview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [completedBookings, setCompletedBookings] = useState<BookingRecord[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [authorName, setAuthorName] = useState<string>(() => {
    return buildPublicDisplayNameSuggestion(currentUser || null);
  });
  const [comment, setComment] = useState<string>('');
  const [rentalDuration, setRentalDuration] = useState<string>('Location week-end');
  const [cautionRestituee, setCautionRestituee] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [formError, setFormError] = useState<string | null>(null);

  // Suggestion anonymisée (Prénom + initiale) si la session devient active
  useEffect(() => {
    if (currentUser && !authorName) {
      setAuthorName(buildPublicDisplayNameSuggestion(currentUser));
    }
  }, [currentUser]);

  // Avis Supabase + temps réel (toutes les fiches se mettent à jour instantanément)
  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      const list = await fetchReviewsByEquipment(equipmentId);
      if (!cancelled) {
        setReviews(list);
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    void loadReviews();
    const unsubscribe = subscribeToReviews(() => {
      void loadReviews();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [equipmentId]);

  // Locations terminées du locataire connecté (autorise et lie le dépôt d'avis)
  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        const hasSession = Boolean(data?.user?.id);
        setIsAuthenticated(hasSession);
        if (!hasSession) {
          setCompletedBookings([]);
          return;
        }
        const bookings = await fetchCompletedBookingsForEquipment(equipmentId);
        if (!cancelled) setCompletedBookings(bookings);
      } catch {
        if (!cancelled) {
          setCompletedBookings([]);
          setIsAuthenticated(false);
        }
      }
    };

    void loadBookings();
    return () => {
      cancelled = true;
    };
  }, [equipmentId, currentUser?.id]);

  const summary = useMemo(() => computeRatingSummary(reviews), [reviews]);

  const reviewableBookings = useMemo(
    () => completedBookings.filter((booking) => !reviews.some((review) => review.bookingId === booking.id)),
    [completedBookings, reviews]
  );

  useEffect(() => {
    if (reviewableBookings.length === 0) {
      setSelectedBookingId('');
      return;
    }
    if (!reviewableBookings.some((booking) => booking.id === selectedBookingId)) {
      setSelectedBookingId(reviewableBookings[0].id);
    }
  }, [reviewableBookings, selectedBookingId]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (filterRating === 'all') return reviews;
    return reviews.filter((r) => Math.round(r.rating) === filterRating);
  }, [reviews, filterRating]);

  const canReview = isAuthenticated && reviewableBookings.length > 0;
  const isFormDisabled = isSubmitting || !canReview || !comment.trim() || !authorName.trim();

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAuthenticated) {
      setFormError('Connectez-vous pour publier un avis sur une location terminée.');
      return;
    }

    const targetBooking =
      reviewableBookings.find((booking) => booking.id === selectedBookingId) || reviewableBookings[0];

    if (!targetBooking) {
      setFormError(
        "Vous pourrez déposer un avis après avoir loué cet équipement et une fois la location terminée (statut « restitué »)."
      );
      return;
    }

    if (!comment.trim() || rating < 1) return;

    setIsSubmitting(true);

    const result = await createReview({
      bookingId: targetBooking.id,
      equipmentId,
      rating,
      comment,
      authorName: authorName.trim() || currentUser?.name || 'Locataire Matik',
      authorRole: 'Locataire Vérifié',
      rentalDuration,
      cautionRestituee,
    });

    setIsSubmitting(false);

    if (!result.success || !result.review) {
      setFormError(result.error || "Impossible de publier l'avis pour le moment.");
      return;
    }

    setReviews((prev) => [result.review as EquipmentReview, ...prev.filter((r) => r.id !== result.review?.id)]);
    onReviewAdded?.(result.review);

    setComment('');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  const starLabels = [
    '',
    'Décevant · Problèmes constatés',
    'Passable · Peut mieux faire',
    'Correct · Conforme aux attentes',
    'Très bon · Recommandé',
    'Excellent · Matériel impeccable & loueur au top',
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Toast feedback */}
      {showSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>Merci pour votre retour ! Votre avis a été enregistré.</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-emerald-600 px-2 py-0.5 rounded-md font-bold">
            Publié
          </span>
        </div>
      )}

      {/* Header & Score Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 items-center">
        {/* Left: Overall Score (4 cols) */}
        <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Avis Locataires & Restitution
          </span>

          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-semibold">Chargement des avis…</span>
            </div>
          ) : summary.average === null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-950">Nouveau</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aucun avis</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-slate-950 tabular-nums">
                {summary.average.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-slate-400">/ 5</span>
            </div>
          )}

          <div className="flex items-center gap-1 my-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  summary.average !== null && star <= Math.round(summary.average)
                    ? 'text-amber-500 fill-amber-400'
                    : 'text-slate-300'
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-slate-600 font-medium">
            {summary.count > 0 ? (
              <>
                Basé sur <strong className="text-slate-900 font-bold">{summary.count} avis vérifiés</strong> après
                restitution de matériel
              </>
            ) : (
              <span>Nouveau matériel · Aucun avis pour l'instant</span>
            )}
          </p>

          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-full mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Avis publiés uniquement après location terminée</span>
          </div>
        </div>

        {/* Right: Stars Distribution Bars (7 cols) */}
        <div className="md:col-span-7 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star as 1 | 2 | 3 | 4 | 5] || 0;
            const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
            const isFilterActive = filterRating === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => setFilterRating(isFilterActive ? 'all' : (star as number))}
                className={`w-full flex items-center gap-3 text-xs p-1 rounded-lg transition-colors cursor-pointer group text-left ${
                  isFilterActive ? 'bg-amber-100/60 font-bold' : 'hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-slate-700">
                  <span>{star}</span>
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                </div>
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 group-hover:bg-amber-500 transition-all rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right text-[11px] text-slate-500 tabular-nums font-semibold shrink-0">
                  {percentage}% <span className="text-[10px] text-slate-400">({count})</span>
                </div>
              </button>
            );
          })}

          {filterRating !== 'all' && (
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setFilterRating('all')}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
              >
                Afficher tous les avis ({reviews.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Write a Review Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <span>Laisser un avis après location</span>
            </h3>
            <p className="text-xs text-slate-500">
              Partagez votre expérience sur <strong>{equipmentName}</strong> pour aider la communauté Matik.
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shrink-0 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Avis Locataire Vérifié</span>
          </span>
        </div>

        {!canReview ? (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                {isAuthenticated ? 'Aucune location terminée à évaluer' : 'Connectez-vous pour laisser un avis'}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAuthenticated
                  ? "Seul un locataire ayant réellement loué cet équipement, avec une location au statut « restitué », peut publier un avis. Chaque location ne peut donner lieu qu'à un seul avis."
                  : "Les avis Matik sont vérifiés : ils ne peuvent être déposés qu'après une location terminée. Connectez-vous avec le compte utilisé pour réserver."}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-5">
            {/* Booking selector (une seule location terminée par avis) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                0. Location concernée *
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full h-12 px-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 text-slate-900"
              >
                {reviewableBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.id} · du {booking.startDate} au {booking.endDate}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Stars Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                1. Votre note globale (de 1 à 5 étoiles) *
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeStar = hoverRating ? star <= hoverRating : star <= rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1 rounded-lg transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                        aria-label={`Noter ${star} sur 5`}
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                            activeStar
                              ? 'text-amber-500 fill-amber-400 stroke-amber-600'
                              : 'text-slate-300 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {starLabels[hoverRating || rating]}
                </span>
              </div>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Author Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Votre nom ou prénom *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Ex: Maxime R. ou Thomas"
                    className="w-full h-12 pl-10 pr-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Rental Duration Context */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Durée de la location
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={rentalDuration}
                    onChange={(e) => setRentalDuration(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 text-slate-900"
                  >
                    <option value="Location 1 journée">Location 1 journée</option>
                    <option value="Location week-end (2-3 jours)">Location week-end (2-3 jours)</option>
                    <option value="Location 1 semaine">Location 1 semaine</option>
                    <option value="Location longue durée (15+ jours)">Location longue durée (15+ jours)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Comment Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                2. Votre commentaire détaillé *
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Décrivez l'état de l'équipement, la facilité de prise en main, la réactivité du loueur et le bon déroulement de la restitution..."
                className="w-full p-4 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-amber-500 leading-relaxed placeholder-slate-400"
              />
            </div>

            {/* Caution Restituee confirmation checkbox */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={cautionRestituee}
                  onChange={(e) => setCautionRestituee(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                />
                <span>
                  <strong>Caution Stripe sans débit :</strong> J'atteste que le matériel a été restitué en bon état et
                  que la caution a été libérée sans débit bancaire.
                </span>
              </label>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0 hidden sm:inline-block">
                Empreinte Stripe · 0 € prélevé
              </span>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                {formError}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isFormDisabled}
                className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
                <span>{isSubmitting ? 'Publication…' : 'Publier mon avis'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2">
          <h4 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
            <span>Tous les avis locataires</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {filteredReviews.length}
            </span>
          </h4>
        </div>

        {isLoading ? (
          <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white space-y-2">
            <Loader2 className="w-7 h-7 text-slate-300 mx-auto animate-spin" />
            <p className="text-xs text-slate-500">Chargement des avis…</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">
              {reviews.length === 0
                ? "Aucun avis pour cet équipement pour l'instant. Il est noté « Nouveau »."
                : "Aucun avis pour cette note pour l'instant."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-3"
              >
                {/* Review Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 border border-slate-200">
                      {rev.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-950">{rev.authorName}</span>
                        {rev.authorRole && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {rev.authorRole}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{rev.date}</span>
                        {rev.rentalDuration && (
                          <>
                            <span>·</span>
                            <span>{rev.rentalDuration}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stars on Right */}
                  <div className="flex items-center gap-1 self-start sm:self-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating ? 'text-amber-500 fill-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Comment Body */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">"{rev.comment}"</p>

                {/* Badges footer */}
                {rev.cautionRestituee && (
                  <div className="pt-2 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Caution Stripe restituée sans débit après contrôle conforme</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
