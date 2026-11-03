import React, { useState, useMemo } from 'react';
import { Equipment, BookingRecord } from '../types';
import {
  Check,
  ShieldCheck,
  ArrowRight,
  Plus,
  Sparkles,
  PackageOpen,
  Star,
  QrCode,
  MessageSquare,
  Eye,
  MapPin,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { EQUIPMENT_CATEGORIES } from '../data/equipment';
import { getEquipmentAvailability } from '../utils/availability';
import { CatalogSkeletonGrid } from './CatalogSkeletonGrid';

interface CatalogProps {
  equipmentList: Equipment[];
  selectedEquipmentId: string;
  bookingList?: BookingRecord[];
  isLoading?: boolean;
  onSelectEquipment: (equipment: Equipment) => void;
  onAddNewEquipment: () => void;
  onOpenPassportModal?: (equipment: Equipment) => void;
  onViewDetails?: (equipment: Equipment, defaultTab?: 'details' | 'avis') => void;
}

export const Catalog: React.FC<CatalogProps> = ({
  equipmentList,
  selectedEquipmentId,
  bookingList = [],
  isLoading = false,
  onSelectEquipment,
  onAddNewEquipment,
  onOpenPassportModal,
  onViewDetails,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  // Le catalogue public ne présente que les annonces actives et publiées (is_published = true)
  const activeEquipments = useMemo(() => {
    return equipmentList.filter(
      (item) => item.isActive !== false && item.is_published !== false
    );
  }, [equipmentList]);

  // Catégories dynamiques et universelles : prédéfinies + toutes les catégories sur-mesure créées
  const categories = useMemo(() => {
    const listCats = Array.from(new Set(activeEquipments.map((e) => e.category).filter(Boolean)));
    const merged = ['Tous', ...EQUIPMENT_CATEGORIES.filter((c) => c !== 'Tous')];
    listCats.forEach((cat) => {
      if (!merged.includes(cat)) {
        merged.push(cat);
      }
    });
    return merged;
  }, [activeEquipments]);

  const filteredEquipment = useMemo(() => {
    if (selectedCategory === 'Tous') {
      return activeEquipments;
    }
    return activeEquipments.filter((item) => item.category === selectedCategory);
  }, [activeEquipments, selectedCategory]);

  return (
    <section id="catalogue" className="py-16 lg:py-24 border-b border-slate-200/80 bg-[#F8FAFC]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-700 tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Plateforme Universelle · Tout se loue sans limite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
              Tout se loue sur Matik
            </h2>
            <p className="text-sm text-slate-600 max-w-xl">
              BTP, Jardin, High-Tech, Maison, Événementiel, Bébés, Mode, Véhicules ou objets insolites. Louez ou proposez n'importe quel équipement en toute sécurité avec caution Stripe.
            </p>
          </div>

          {/* Loueur Add Equipment CTA */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddNewEquipment}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-sm shadow-amber-400/25 whitespace-nowrap cursor-pointer shrink-0"
              title="Ajouter un équipement avec son montant de caution obligatoire"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Déposer une annonce</span>
            </button>
          </div>
        </div>

        {/* Ergonomic Category Filter Pills (placées juste en haut du catalogue) */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 scale-102 font-bold ring-2 ring-slate-900'
                    : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 shadow-xs'
                }`}
              >
                <span>{category}</span>
                {category === 'Tous' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {equipmentList.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results summary (only when there are items) */}
        {equipmentList.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span>
                Affichage de <strong className="text-slate-900 font-bold">{filteredEquipment.length}</strong> équipement
                {filteredEquipment.length > 1 ? 's' : ''} disponible{filteredEquipment.length > 1 ? 's' : ''}
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                  <span>Synchronisation...</span>
                </span>
              )}
            </span>
            {selectedCategory !== 'Tous' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('Tous')}
                className="text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Skeleton Grid pendant le chargement initial quand aucune annonce n'est encore disponible */}
        {isLoading && filteredEquipment.length === 0 ? (
          <CatalogSkeletonGrid count={8} />
        ) : filteredEquipment.length === 0 ? (
          <div className="mt-12 py-16 px-6 max-w-xl mx-auto text-center bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs">
              <PackageOpen className="w-8 h-8 stroke-[1.75]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-950">
                Aucun équipement disponible pour le moment. Soyez le premier à déposer une annonce !
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                Rentabilisez le matériel qui dort chez vous ou à l'atelier en toute sécurité avec contrat automatisé et caution sécurisée Stripe.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onAddNewEquipment}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-md shadow-amber-400/25 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Déposer une annonce</span>
              </button>
            </div>
          </div>
        ) : (
          /* Responsive 1/2/3/4 Column Grid */
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEquipment.map((item) => {
              const isSelected = selectedEquipmentId === item.id;
              const isParticulier = item.ownerType === 'particulier';
              const availability = getEquipmentAvailability(item, bookingList);

              return (
                <div
                  key={item.id}
                  className={`group flex flex-col justify-between rounded-2xl border bg-white overflow-hidden transition-all duration-300 ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-xl shadow-amber-400/10 -translate-y-1'
                      : availability.isRented
                      ? 'border-rose-200/90 hover:border-rose-300 hover:shadow-lg'
                      : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div>
                    {/* Card Image Container with 4:3 aspect ratio & hover zoom */}
                    <div
                      onClick={() => onViewDetails?.(item, 'details')}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className={`w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500 ease-out ${
                          availability.isRented ? 'grayscale-[25%] contrast-[0.95]' : ''
                        }`}
                      />

                      {/* Gradient overlay on hover for image depth */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />

                      {/* Top-left: Loueur Owner Badge (Particulier Vérifié or Pro) */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm backdrop-blur-md ${
                            isParticulier
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-slate-900/90 text-amber-300 border border-slate-700'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{isParticulier ? 'Particulier Vérifié' : 'Pro Vérifié'}</span>
                        </span>
                      </div>

                      {/* Top-right: Prominent Availability badge (Loué / Disponible / Indisponible) */}
                      <div className="absolute top-3 right-3 z-10">
                        {availability.isRented ? (
                          <span
                            className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-rose-600/95 backdrop-blur-md text-white border border-rose-500 shadow-md flex items-center gap-1.5 tracking-wide animate-in fade-in"
                            title={`Équipement loué jusqu'au ${availability.formattedEndDate}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span>Loué {availability.formattedEndDate ? `· Jusqu'au ${availability.formattedEndDate}` : ''}</span>
                          </span>
                        ) : !availability.isAvailable ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800/90 backdrop-blur-md text-slate-200 border border-slate-700 shadow-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>{availability.badge.label}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/95 backdrop-blur-md text-emerald-700 border border-emerald-200/80 shadow-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Disponible</span>
                          </span>
                        )}
                      </div>

                      {/* Bottom-right: Quick View Pill */}
                      {onViewDetails && (
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-950/80 text-white backdrop-blur-md border border-slate-700/80 shadow-xs flex items-center gap-1 z-10">
                          <Eye className="w-3 h-3 text-amber-400" />
                          <span>Fiche & Avis</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 space-y-3">
                      {/* Category & Location / Partner */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-amber-700 uppercase tracking-wider text-[11px]">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
                          {item.city ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 truncate" title={item.city}>
                              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">{item.city}</span>
                            </span>
                          ) : (
                            <span className="truncate" title={item.partnerArtisan}>
                              {item.partnerArtisan}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Equipment Name in Bold */}
                      <h3
                        onClick={() => onViewDetails?.(item, 'details')}
                        className="text-base font-bold text-slate-950 group-hover:text-amber-700 transition-colors leading-snug cursor-pointer"
                      >
                        {item.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Specs Pills Grid */}
                      {item.specs && item.specs.length > 0 && (
                        <div className="pt-2 grid grid-cols-2 gap-2 border-t border-slate-100 text-[11px]">
                          {item.specs.map((spec, index) => (
                            <div key={index} className="space-y-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-500 block truncate text-[10px]">{spec.label}</span>
                              <span className="text-slate-900 font-semibold block truncate">
                                {spec.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* INNOVATION 4: Matik Trust Score Strip with direct click to reviews */}
                      <button
                        type="button"
                        onClick={() => onViewDetails?.(item, 'avis')}
                        className="pt-2.5 w-full flex items-center justify-between text-[11px] bg-slate-50 hover:bg-amber-50/60 px-2.5 py-1.5 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors text-slate-600 text-left cursor-pointer"
                        title="Voir les avis locataires et notes 5 étoiles vérifiées"
                      >
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>4.9</span>
                          <span className="text-slate-400 font-normal">/5</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>100% Cautions sans litige</span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-semibold underline">
                          Lire avis
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom: Price, Stripe Deposit Callout & Direct Reserver CTA */}
                  <div className="p-5 pt-0 space-y-3">
                    {/* Daily Rate & Deposit Callout */}
                    <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                          Tarif location
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-950 tabular-nums">
                            {item.dailyRate} €
                          </span>
                          <span className="text-xs text-slate-500 font-medium">/ jour</span>
                        </div>
                      </div>

                      {/* Prominent Caution Display */}
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 bg-amber-50 border border-amber-200/90 px-2.5 py-1 rounded-lg">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Caution Stripe : {item.depositAmount} €</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                          Empreinte sans débit
                        </span>
                      </div>
                    </div>

                    {/* Actions: Direct "Réserver" Button + Review & Passport Triggers */}
                    <div className="flex items-center gap-2">
                      {availability.isRented ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200/90 cursor-not-allowed shadow-none select-none"
                          title={`Équipement actuellement en cours de location jusqu'au ${availability.formattedEndDate}`}
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Loué {availability.formattedEndDate ? `· Retour ${availability.formattedEndDate}` : ''}</span>
                        </button>
                      ) : !availability.isAvailable ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200/90 cursor-not-allowed shadow-none select-none"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{availability.badge.label}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectEquipment(item)}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm shadow-amber-400/20 active:scale-98'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Sélectionné · Remplir formulaire</span>
                            </>
                          ) : (
                            <>
                              <span>Réserver cet équipement</span>
                              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            </>
                          )}
                        </button>
                      )}

                      {/* Button to open reviews directly */}
                      {onViewDetails && (
                        <button
                          type="button"
                          onClick={() => onViewDetails(item, 'avis')}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition-colors cursor-pointer shrink-0"
                          title="Consulter et déposer un avis 5 étoiles"
                        >
                          <MessageSquare className="w-4 h-4 text-amber-600" />
                        </button>
                      )}

                      {onOpenPassportModal && (
                        <button
                          type="button"
                          onClick={() => onOpenPassportModal(item)}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer shrink-0"
                          title="Voir le Passeport QR Code officiel & état des lieux"
                        >
                          <QrCode className="w-4 h-4 text-slate-700" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
