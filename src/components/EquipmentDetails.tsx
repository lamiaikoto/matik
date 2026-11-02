import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Star,
  Lock,
  ArrowRight,
  QrCode,
  Check,
  Sparkles,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Info,
} from 'lucide-react';
import { Equipment, CurrentUser } from '../types';
import { ReviewSystem } from './ReviewSystem';

interface EquipmentDetailsProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectBooking: (equipment: Equipment) => void;
  onOpenPassport?: (equipment: Equipment) => void;
  currentUser?: CurrentUser;
}

export const EquipmentDetails: React.FC<EquipmentDetailsProps> = ({
  equipment,
  isOpen,
  onClose,
  onSelectBooking,
  onOpenPassport,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'avis'>('details');

  if (!isOpen || !equipment) return null;

  const isParticulier = equipment.ownerType === 'particulier';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide shrink-0 ${
                isParticulier ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
              }`}
            >
              {isParticulier ? 'Particulier Vérifié' : 'Pro Vérifié'}
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                {equipment.name}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {equipment.category} · Propriétaire : {equipment.partnerArtisan}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-3"
            aria-label="Fermer la fiche"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Fiche technique vs Avis & Notes) */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3.5 px-4 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Fiche descriptive & Tarifs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('avis')}
            className={`py-3.5 px-4 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'avis'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>Avis Locataires & Notes</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-8 flex-1">
          {activeTab === 'details' ? (
            <div className="space-y-8">
              {/* Top Section: Image + Fast Booking Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Product Image (7 cols) */}
                <div className="md:col-span-7 space-y-3">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={equipment.image}
                      alt={equipment.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md text-emerald-800 text-xs font-bold border border-emerald-200 shadow-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Disponible immédiatement</span>
                    </div>
                  </div>

                  {/* Trust highlight banner */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Protection Matik 100% sans débit :</strong> L'empreinte de caution Stripe ({equipment.depositAmount} €) ne bloque ni ne débite vos fonds.
                    </div>
                  </div>
                </div>

                {/* Pricing & Booking Card (5 cols) */}
                <div className="md:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Tarif de location
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-4xl font-black text-slate-950 tabular-nums">
                          {equipment.dailyRate} €
                        </span>
                        <span className="text-sm font-semibold text-slate-500">/ jour</span>
                      </div>
                    </div>

                    {/* Caution box */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          Caution Stripe non débitée :
                        </span>
                        <span className="text-slate-950 font-black text-sm">
                          {equipment.depositAmount} €
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Caution Stripe non débitée : simple empreinte bancaire libérée automatiquement à la restitution conforme. Frais de service & garantie Matik (10%) appliqués à la commande.
                      </p>
                    </div>

                    {/* Quick Specs summary */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>Catégorie</span>
                        <strong className="text-slate-900">{equipment.category}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>Loueur</span>
                        <strong className="text-slate-900">{equipment.partnerArtisan}</strong>
                      </div>
                      {equipment.city && (
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span>Localisation</span>
                          <strong className="text-slate-900 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-500" />
                            {equipment.city}
                          </strong>
                        </div>
                      )}
                      <div className="flex justify-between py-1">
                        <span>État des lieux</span>
                        <strong className="text-emerald-700">Photos certifiées incluses</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectBooking(equipment);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-md shadow-amber-400/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Réserver cet équipement</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    {onOpenPassport && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPassport(equipment);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-600" />
                        <span>Voir le Passeport QR Code</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description & Technical Specs */}
              <div className="space-y-6 pt-4 border-t border-slate-200">
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-950">
                    Description de l'équipement
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {equipment.description}
                  </p>
                </div>

                {equipment.specs && equipment.specs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-extrabold text-slate-950">
                      Caractéristiques techniques
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {equipment.specs.map((spec, index) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            {spec.label}
                          </span>
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {spec.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {equipment.tags && equipment.tags.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Garanties & Inclus vérifiés
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {equipment.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-amber-600" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Teaser to Reviews */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-950 text-sm">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span>Note moyenne vérifiée : 4.9 / 5</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Consultez les retours d'expérience des locataires ayant loué cet équipement avec restitution de caution.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('avis')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  Lire & Laisser un avis
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: REVIEW SYSTEM */
            <ReviewSystem
              equipmentId={equipment.id}
              equipmentName={equipment.name}
              currentUser={currentUser}
            />
          )}
        </div>
      </div>
    </div>
  );
};
