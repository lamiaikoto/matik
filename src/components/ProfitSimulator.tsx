import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Calculator,
  ShieldCheck,
  ArrowRight,
  Sliders,
  Camera,
  Wrench,
  PartyPopper,
  Car,
  Compass,
  Trees,
  CheckCircle2,
} from 'lucide-react';

interface ProfitSimulatorProps {
  onStartDepot: (suggestedCategory?: string, suggestedName?: string, suggestedPrice?: number) => void;
}

interface EquipmentPreset {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  defaultDailyRate: number;
  typicalDeposit: number;
  highlight: string;
}

const PRESET_ITEMS: EquipmentPreset[] = [
  {
    id: 'perfo',
    name: 'Perforateur Burineur Pro SDS Max',
    category: 'Bricolage & Outillage BTP',
    icon: <Wrench className="w-4 h-4 text-amber-600" />,
    defaultDailyRate: 25,
    typicalDeposit: 250,
    highlight: 'Très forte demande les week-ends pour travaux & rénovations',
  },
  {
    id: 'drone',
    name: 'Drone 4K Stabilisé DJI Mini Pro',
    category: 'High-Tech & Audiovisuel',
    icon: <Camera className="w-4 h-4 text-indigo-600" />,
    defaultDailyRate: 35,
    typicalDeposit: 350,
    highlight: 'Très prisé pour les mariages, vacances et tournages',
  },
  {
    id: 'sono',
    name: 'Pack Sono 1500W Bluetooth + Micros',
    category: 'Événementiel, Son & Lumière',
    icon: <PartyPopper className="w-4 h-4 text-purple-600" />,
    defaultDailyRate: 35,
    typicalDeposit: 350,
    highlight: 'Loué quasi tous les vendredis et samedis soir',
  },
  {
    id: 'motoculteur',
    name: 'Motoculteur Thermique 7CV Rotovator',
    category: 'Jardin & Espaces Verts',
    icon: <Trees className="w-4 h-4 text-emerald-600" />,
    defaultDailyRate: 30,
    typicalDeposit: 300,
    highlight: 'Forte demande printanière et automnale pour potagers',
  },
  {
    id: 'remorque',
    name: 'Remorque Bâchée Double Essieu 750kg',
    category: 'Véhicules, Remorques & Transport',
    icon: <Car className="w-4 h-4 text-blue-600" />,
    defaultDailyRate: 25,
    typicalDeposit: 250,
    highlight: 'Idéale pour déménagements, transports et vacances',
  },
  {
    id: 'vtt',
    name: 'VTT Électrique Tout Suspendu 29"',
    category: 'Sport, Montagne & Nautisme',
    icon: <Compass className="w-4 h-4 text-orange-600" />,
    defaultDailyRate: 25,
    typicalDeposit: 300,
    highlight: 'Plébiscité les week-ends nature et vacances scolaires',
  },
];

export const ProfitSimulator: React.FC<ProfitSimulatorProps> = ({ onStartDepot }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_ITEMS[0].id);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(3);
  const [customPrice, setCustomPrice] = useState<number>(PRESET_ITEMS[0].defaultDailyRate);

  const selectedPreset = useMemo(
    () => PRESET_ITEMS.find((p) => p.id === selectedPresetId) || PRESET_ITEMS[0],
    [selectedPresetId]
  );

  const handleSelectPreset = (preset: EquipmentPreset) => {
    setSelectedPresetId(preset.id);
    setCustomPrice(preset.defaultDailyRate);
  };

  const monthlyEarnings = useMemo(() => {
    return Math.round(customPrice * daysPerMonth);
  }, [customPrice, daysPerMonth]);

  const yearlyEarnings = useMemo(() => {
    return monthlyEarnings * 12;
  }, [monthlyEarnings]);

  return (
    <section className="py-14 sm:py-20 bg-gradient-to-b from-white via-slate-50/50 to-white border-y border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
            <Calculator className="w-3.5 h-3.5 text-amber-600" />
            <span>Simulateur de Gains Interactif Matik</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Combien peut vous rapporter le matériel qui dort chez vous ?
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Sélectionnez votre type d'équipement ou ajustez le curseur pour estimer vos revenus passifs réels, 100% protégés par la caution Stripe sans débit.
          </p>
        </div>

        {/* Interactive Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Presets & Controls (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Choisissez un exemple d'équipement
                </span>
                <span className="text-xs text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Idéal pour débuter
                </span>
              </div>

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_ITEMS.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3.5 rounded-2xl text-left border transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{preset.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{preset.category}</div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Tarif libre à fixer</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Slider 1: Days rented per month */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    Nombre de jours de location par mois :
                  </span>
                  <span className="font-extrabold text-base text-slate-950 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                    {daysPerMonth} {daysPerMonth > 1 ? 'jours' : 'jour'} / mois
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={daysPerMonth}
                  onChange={(e) => setDaysPerMonth(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>1 jour (Occasionnel)</span>
                  <span>1 week-end (2-3 j)</span>
                  <span>2 week-ends (4-5 j)</span>
                  <span>Régulier (10-15 j)</span>
                </div>
              </div>

              {/* Slider 2: Price per day */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-bold text-slate-800">
                    Prix de location par jour fixé librement par vous :
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(Math.max(5, Number(e.target.value)))}
                      className="w-20 px-2 py-1 text-right font-extrabold text-base text-slate-950 bg-slate-100 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-500">€ / j</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Accessible (10-25 €)</span>
                  <span>Intermédiaire (30-50 €)</span>
                  <span>Équipement Pro (60-100 €+)</span>
                </div>
              </div>
            </div>

            {/* Note on security */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Caution Stripe : bloquée en simple empreinte bancaire sans débit, ajustée selon la valeur réelle de votre équipement.
              </span>
            </div>
          </div>

          {/* Right: Projected Revenue Card (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-950 text-white p-7 sm:p-9 flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-800">
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Vos gains nets estimés
                </span>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  0 frais caché
                </span>
              </div>

              {/* Big Revenue Display */}
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-medium">Revenu mensuel estimé</div>
                <div className="text-5xl sm:text-6xl font-black text-amber-400 tracking-tight tabular-nums flex items-baseline gap-2">
                  <span>+{monthlyEarnings}</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">€ / mois</span>
                </div>
                <p className="text-xs text-slate-400">
                  Soit environ <strong className="text-white font-bold">{yearlyEarnings.toLocaleString('fr-FR')} €</strong> par an pour quelques jours d'inutilisation.
                </p>
              </div>

              {/* Key benefits list */}
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Caution bancaire Stripe :</strong> Votre matériel est couvert jusqu'à {selectedPreset.typicalDeposit} € sans prélever le locataire.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Contrat numérique certifié :</strong> Horodatage juridique et état des lieux photo inclus.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Passeport QR Code :</strong> Remise de clés en 10 secondes montre en main.
                  </span>
                </div>
              </div>
            </div>

            {/* Direct CTA */}
            <div className="relative pt-8">
              <button
                type="button"
                onClick={() =>
                  onStartDepot(
                    selectedPreset.category,
                    selectedPreset.name,
                    customPrice
                  )
                }
                className="w-full py-4 px-6 rounded-2xl text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-lg shadow-amber-400/25 transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <span>Déposer cette annonce maintenant</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2.5">
                Dépôt gratuit en moins de 2 minutes · Loueur Pro ou Particulier
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
