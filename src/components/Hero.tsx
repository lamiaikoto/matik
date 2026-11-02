import React from 'react';
import { ArrowDown, ArrowRight, ShieldCheck, Plus } from 'lucide-react';
import heroUniversalImage from '../assets/images/hero_equipment_universal_1793131513238.jpg';

interface HeroProps {
  onExploreCatalog: () => void;
  onOpenBooking: () => void;
  onNavigateLoueur?: () => void;
  onAddNewEquipment?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExploreCatalog,
  onOpenBooking,
  onAddNewEquipment,
}) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-22 border-b border-slate-200/80 bg-gradient-to-b from-white via-[#F8FAFC] to-slate-100/50">
      {/* Background ambient warm lighting */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[400px] bg-amber-400/10 blur-[130px] rounded-full"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 2-column balanced layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Colonne de gauche (7 cols on large desktop for generous typography) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tagline kicker */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold tracking-wide shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Louez du matériel pro ou particulier en 3 clics</span>
            </div>

            {/* Titre principal responsive avec dégradé amber demandé */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.12] max-w-2xl text-balance">
              Faites louer le matériel{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400">
                qui dort chez vous
              </span>
            </h1>

            {/* Texte descriptif demandé avec contraste renforcé en Slate-700 */}
            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed max-w-2xl">
              Rentabilisez vos équipements inutilisés — BTP, High-Tech, jardin, événementiel, maison, véhicules ou objets personnels — en toute sérénité. Contrat numérique instantané et caution automatique Stripe, sans jamais débiter le locataire.
            </p>

            {/* Badges de réassurance */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium shadow-xs">
                <span className="text-amber-500 text-base leading-none">⚡</span>
                <span>Contrat sous 30 secondes</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium shadow-xs">
                <span className="text-emerald-600 text-base leading-none">🔒</span>
                <span>Empreinte CB sans débit immédiat</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium shadow-xs">
                <span className="text-blue-600 text-base leading-none">🤝</span>
                <span>Envoi direct par e-mail</span>
              </div>
            </div>

            {/* Boutons d'action alignés */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 flex-wrap">
              <button
                type="button"
                onClick={onOpenBooking}
                className="inline-flex justify-center items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-md shadow-amber-400/25 cursor-pointer"
              >
                <span>Réserver un équipement</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {onAddNewEquipment && (
                <button
                  type="button"
                  onClick={onAddNewEquipment}
                  className="inline-flex justify-center items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-slate-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                  <span>+ Déposer une annonce</span>
                </button>
              )}

              <button
                type="button"
                onClick={onExploreCatalog}
                className="inline-flex justify-center items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-xs transition-colors cursor-pointer"
              >
                <span>Explorer le catalogue</span>
                <ArrowDown className="w-4 h-4 text-amber-500" />
              </button>
            </div>
          </div>

          {/* Colonne de droite (5 cols) : Visuel d'illustration avec badge Parc vérifié */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60 group">
              {/* Badge "Parc vérifié" */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-emerald-500/40 text-slate-900 shadow-lg">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Parc vérifié
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-[10px] text-slate-500">Équipements contrôlés & certifiés</div>
                </div>
              </div>

              {/* Conteneur d'image */}
              <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={heroUniversalImage}
                  alt="Showroom de matériel professionnel et particulier : caméra cinéma, drone, système son et outillage"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  className="w-full h-full object-cover object-center transform group-hover:scale-104 transition-transform duration-700 ease-out"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                {/* Bandeau d'infos matériel */}
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs text-slate-200 flex items-center justify-between gap-2 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-semibold text-white">BTP · High-Tech · Maison · Véhicules · Tout se loue</span>
                  </div>
                  <span className="text-amber-400 text-xs font-bold">100% assuré</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Proof & Performance Strip */}
        <div className="mt-14 pt-8 border-t border-slate-200/90 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-950 tracking-tight tabular-nums">Tout se loue</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sans aucune limite</div>
            <p className="text-xs text-slate-600">Plus de 20 univers & catégories libres</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-950 tracking-tight tabular-nums">0 € débité</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Caution loueur fixée</div>
            <p className="text-xs text-slate-600">Empreinte bancaire Stripe sécurisée</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-950 tracking-tight tabular-nums">30 sec</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Contrat instantané</div>
            <p className="text-xs text-slate-600">Généré et expédié automatiquement</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-950 tracking-tight tabular-nums">0 SIRET</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pour les particuliers</div>
            <p className="text-xs text-slate-600">Déposez vos objets en 1 minute</p>
          </div>
        </div>
      </div>
    </section>
  );
};
