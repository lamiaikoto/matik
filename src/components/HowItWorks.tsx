import React from 'react';
import { Search, FileCheck2, CreditCard, Wrench, Shield, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC<{ onStartBooking: () => void }> = ({ onStartBooking }) => {
  const steps = [
    {
      num: '01',
      title: 'Sélectionnez votre matériel',
      desc: 'Parcourez notre catalogue d’équipements professionnels BTP, découpe, béton et outillage lourd révisés.',
      icon: Search,
    },
    {
      num: '02',
      title: 'Contrat certifié en 30 sec',
      desc: 'Renseignez vos dates et coordonnées. Notre plateforme génère instantanément votre contrat de location légal et conforme.',
      icon: FileCheck2,
    },
    {
      num: '03',
      title: 'Empreinte Stripe sans débit',
      desc: 'Une empreinte de caution fixée selon le matériel est réservée via Stripe. Aucun montant n\'est débité de votre compte.',
      icon: CreditCard,
    },
    {
      num: '04',
      title: 'Retrait immédiat chez l’artisan',
      desc: 'Récupérez l’équipement testé et prêt à l’emploi auprès de votre artisan partenaire ou dépôt le plus proche.',
      icon: Wrench,
    },
  ];

  return (
    <section id="fonctionnement" className="py-16 lg:py-24 border-b border-slate-200/80 bg-slate-50/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-2 mb-12">
          <div className="text-xs font-bold text-amber-700 tracking-wider uppercase">
            Processus Simplifié
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
            Comment fonctionne la location en 3 clics
          </h2>
          <p className="text-sm text-slate-600">
            Une expérience fluide sans bureaucratie pour les professionnels du bâtiment et les particuliers exigeants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-4 relative flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-amber-500 tabular-nums">{step.num}</span>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-950">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <span>Temps estimé : ~30 secondes</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature highlight banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-lg font-bold text-white">Besoin d'un équipement spécifique ou pour une longue durée ?</h4>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Nos artisans et partenaires disposent de parcs complets (mini-pelles, nacelles, compresseurs industriels, matériel cinéma).
            </p>
          </div>
          <button
            type="button"
            onClick={onStartBooking}
            className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shrink-0 cursor-pointer shadow-md shadow-amber-400/20"
          >
            Lancer une réservation
          </button>
        </div>
      </div>
    </section>
  );
};
