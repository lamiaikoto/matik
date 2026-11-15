import React, { useEffect, useMemo, useState } from 'react';
import { Star, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { computeRatingSummary, fetchAllReviews, subscribeToReviews } from '../lib/reviewService';
import type { EquipmentReview } from '../types';

interface TestimonialsProps {
  onStartBooking?: () => void;
}

const MAX_CARDS = 3;
const MIN_COMMENT_LENGTH = 20;

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'MT';

/**
 * Avis réels publiés par les locataires (table public.reviews).
 * La section est entièrement masquée tant qu'aucun avis n'existe :
 * aucun témoignage, nom ou note ne doit être inventé.
 */
export const Testimonials: React.FC<TestimonialsProps> = ({ onStartBooking }) => {
  const [reviews, setReviews] = useState<EquipmentReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const data = await fetchAllReviews();
      if (!active) return;
      setReviews(data);
      setLoading(false);
    };

    void load();
    const unsubscribe = subscribeToReviews(() => {
      void load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const { average, count } = computeRatingSummary(reviews);

  const featured = useMemo(
    () =>
      [...reviews]
        .filter((review) => review.comment.trim().length >= MIN_COMMENT_LENGTH)
        .sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, MAX_CARDS),
    [reviews]
  );

  // Aucun avis réel (ou chargement en cours) : la section n'est pas rendue.
  if (loading || count === 0 || featured.length === 0 || average === null) {
    return null;
  }

  return (
    <section id="temoignages" className="py-16 lg:py-24 border-b border-slate-200/80 bg-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="text-xs font-bold text-amber-700 tracking-wider uppercase">
              Retours d'Expérience
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
              Ce que disent les locataires Matik
            </h2>
            <p className="text-sm text-slate-600 max-w-xl">
              Avis publiés par des locataires après une location terminée sur la plateforme.
            </p>
          </div>

          {/* Average satisfaction badge (calculé sur les avis réels) */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 shadow-xs">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(average)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-transparent text-slate-300'
                  }`}
                />
              ))}
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="text-sm font-extrabold text-slate-950 tabular-nums leading-none">
                {average.toFixed(1).replace('.', ',')} / 5
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {count} avis {count > 1 ? 'vérifiés' : 'vérifié'}
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((rev) => (
            <div
              key={rev.id}
              className="flex flex-col justify-between p-6 rounded-2xl bg-slate-50/60 hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 transition-all duration-200 space-y-5 shadow-xs hover:shadow-md group"
            >
              <div className="space-y-4">
                {/* Top card header: Stars + Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-slate-400">{rev.date}</span>
                </div>

                {/* Comment quote */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  « {rev.comment} »
                </p>

                {/* Rental duration tag */}
                {rev.rentalDuration && (
                  <div className="text-xs text-slate-500 font-medium pt-2 border-t border-slate-200/80">
                    <span className="text-amber-800 font-semibold">Durée de location :</span>{' '}
                    {rev.rentalDuration}
                  </div>
                )}
              </div>

              {/* Author footer */}
              <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 text-amber-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {getInitials(rev.authorName)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold text-slate-950 leading-tight flex items-center gap-1.5 truncate">
                      <span>{rev.authorName}</span>
                      <span title="Location terminée sur Matik" className="inline-flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {rev.authorRole || 'Locataire'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust banner under testimonials */}
        <div className="mt-10 p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Un avis ne peut être publié qu'après une location terminée : la plateforme vérifie
              la réservation correspondante avant l'enregistrement.
            </span>
          </div>
          {onStartBooking && (
            <button
              type="button"
              onClick={onStartBooking}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              Trouver un matériel
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
