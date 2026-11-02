import React from 'react';
import { Star, ShieldCheck, Quote, CheckCircle2 } from 'lucide-react';

interface TestimonialsProps {
  onStartBooking?: () => void;
}

export const Testimonials: React.FC<TestimonialsProps> = ({ onStartBooking }) => {
  const reviews = [
    {
      id: 'rev-1',
      name: 'Marc Delorme',
      role: 'Artisan Maçon & Rénovateur',
      company: 'Delorme BTP (Lyon)',
      rating: 5,
      equipmentRented: 'Mini-Pelle 1.5T & Brise-béton',
      date: 'Il y a 4 jours',
      comment:
        'L’empreinte de caution sans débit immédiat est une révolution pour les artisans. Bloquer 1500 € en avance aurait pesé lourd sur ma trésorerie. Contrat signé sur smartphone en 30 secondes et matériel impeccable sur le chantier.',
      verified: true,
      initials: 'MD',
    },
    {
      id: 'rev-2',
      name: 'Sophie Mercier',
      role: 'Paysagiste & Créatrice d’espaces',
      company: 'Atelier Jardins Verts (Nantes)',
      rating: 5,
      equipmentRented: 'Nettoyeur HP 250 Bars & Bétonnière',
      date: 'Il y a 1 semaine',
      comment:
        'Matériel révisé, réservoirs pleins et mise à disposition ultra rapide chez le dépôt partenaire. La confirmation directe par e-mail avec le QR code de retrait simplifie tout. Un service pro et transparent.',
      verified: true,
      initials: 'SM',
    },
    {
      id: 'rev-3',
      name: 'Karim Bensaid',
      role: 'Menuisier & Agenceur d’intérieur',
      company: 'KB Rénov (Paris 11)',
      rating: 5,
      equipmentRented: 'Scie Plongeante Précision Laser',
      date: 'Il y a 2 semaines',
      comment:
        'La précision de la scie avec le rail aluminium m’a permis de poser 75m² de parquet massif sans aucun éclat. Zéro paperasse au comptoir, tout est automatisé. Je recommande à 100% aux professionnels.',
      verified: true,
      initials: 'KB',
    },
  ];

  return (
    <section id="temoignages" className="py-16 lg:py-24 border-b border-slate-200/80 bg-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="text-xs font-bold text-amber-700 tracking-wider uppercase">
              Retours d'Expérience & Cas d'Usage
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
              Ce que permet la plateforme Matik
            </h2>
            <p className="text-sm text-slate-600 max-w-xl">
              Artisans du BTP, créateurs et particuliers témoignent de la simplicité du contrat numérique et de l'empreinte sans débit.
            </p>
          </div>

          {/* Average satisfaction badge */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 shadow-xs">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="text-sm font-extrabold text-slate-950 tabular-nums leading-none">
                4.9 / 5
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Avis certifiés vérifiés</div>
            </div>
          </div>
        </div>

        {/* Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev) => (
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

                {/* Equipment rented tag */}
                <div className="text-xs text-slate-500 font-medium pt-2 border-t border-slate-200/80">
                  <span className="text-amber-800 font-semibold">Matériel loué :</span> {rev.equipmentRented}
                </div>
              </div>

              {/* Author footer */}
              <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 text-amber-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {rev.initials}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold text-slate-950 leading-tight flex items-center gap-1.5 truncate">
                      <span>{rev.name}</span>
                      {rev.verified && (
                        <span title="Profil vérifié" className="inline-flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">{rev.role}</div>
                    <div className="text-[11px] text-slate-400 truncate">{rev.company}</div>
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
              100% des avis proviennent de locataires ayant validé une empreinte bancaire et restitué leur équipement.
            </span>
          </div>
          {onStartBooking && (
            <button
              type="button"
              onClick={onStartBooking}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              Réserver comme eux
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
