import React, { useState } from 'react';
import {
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  FileCheck2,
  Upload,
  RotateCcw,
  Clock,
  UserCheck,
  Lock,
  Star,
} from 'lucide-react';
import { Equipment, BookingRecord, InspectionReport } from '../types';

interface DigitalInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  booking?: BookingRecord | null;
  type: 'check_in' | 'check_out';
  onSaveReport: (report: InspectionReport, releaseCaution?: boolean) => void;
  onOpenReview?: (equipment: Equipment) => void;
}

export const DigitalInspectionModal: React.FC<DigitalInspectionModalProps> = ({
  isOpen,
  onClose,
  equipment,
  booking,
  type,
  onSaveReport,
  onOpenReview,
}) => {
  const [photo1, setPhoto1] = useState<string>('');
  const [photo2, setPhoto2] = useState<string>('');
  const [photo3, setPhoto3] = useState<string>('');
  const [cleanliness, setCleanliness] = useState<'impeccable' | 'correct' | 'a_nettoyer'>('impeccable');
  const [functionalStatus, setFunctionalStatus] = useState<'conforme' | 'remarque'>('conforme');
  const [notes, setNotes] = useState('');
  const [validatedByBoth, setValidatedByBoth] = useState(false);
  const [isSuccessStep, setIsSuccessStep] = useState(false);

  if (!isOpen || (!equipment && !booking)) return null;

  const equipName = equipment?.name || booking?.equipmentName || 'Équipement';
  const cautionAmount = equipment?.depositAmount || booking?.cautionAmount || 300;

  // Pre-load default sample photos if user clicks quick fill
  const handleSimulatePhotos = () => {
    const defaultImg = equipment?.image || booking?.equipmentImage || '';
    if (defaultImg) {
      setPhoto1(defaultImg);
      setPhoto2(defaultImg);
      setPhoto3(defaultImg);
    }
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        if (index === 1) setPhoto1(res);
        if (index === 2) setPhoto2(res);
        if (index === 3) setPhoto3(res);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const photos = [photo1, photo2, photo3].filter(Boolean);

    const report: InspectionReport = {
      id: `report-${Date.now()}`,
      bookingId: booking?.id || `sim-${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      photos: photos.length > 0 ? photos : [equipment?.image || ''],
      cleanliness,
      functionalStatus,
      notes: notes.trim(),
      validatedByOwner: true,
      validatedByTenant: true,
      cautionReleased: type === 'check_out',
    };

    onSaveReport(report, type === 'check_out');
    setIsSuccessStep(true);
  };

  const handleFinish = () => {
    setIsSuccessStep(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                type === 'check_in' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-white'
              }`}
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white">
                  {type === 'check_in'
                    ? "État des Lieux Numérique · Check-in Départ"
                    : "État des Lieux de Restitution · Check-out Retour"}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    type === 'check_in'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  Horodaté
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {equipName} · Caution sous séquestre Stripe : {cautionAmount} €
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isSuccessStep ? (
          <div className="p-8 text-center space-y-6 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h4 className="text-2xl font-black text-slate-950">
                {type === 'check_in'
                  ? "État des lieux de départ validé !"
                  : "Restitution conforme & Caution libérée !"}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                {type === 'check_in'
                  ? `Les photos horodatées sont annexées au contrat. La couverture Matik et l'empreinte de caution de ${cautionAmount} € sont officiellement actives.`
                  : `L'attestation de restitution a été générée. L'empreinte bancaire Stripe de ${cautionAmount} € a été levée sans aucun prélèvement sur le compte du locataire.`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 max-w-md mx-auto flex items-center justify-between">
              <span className="font-semibold text-slate-900">Horodatage officiel :</span>
              <span className="font-mono text-slate-500">{new Date().toLocaleString('fr-FR')}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {type === 'check_out' && onOpenReview && (
                <button
                  type="button"
                  onClick={() => {
                    const targetEq = equipment || {
                      id: booking?.equipmentId || 'eq-1',
                      name: booking?.equipmentName || equipName,
                      category: booking?.equipmentCategory || '',
                      dailyRate: 30,
                      depositAmount: cautionAmount,
                      image: booking?.equipmentImage || '',
                      description: '',
                      specs: [],
                      partnerArtisan: '',
                      inStock: true,
                    };
                    handleFinish();
                    onOpenReview(targetEq);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-400/20"
                >
                  <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
                  <span>Laisser un avis 5 étoiles sur cette location</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {/* Context Notice */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Protection juridique zéro contestation :</strong> Prenez 3 photos nettes de l'équipement avec le locataire. Elles font foi en cas de litige et sécurisent la restitution de la caution.
              </div>
            </div>

            {/* Quick Simulation trigger */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Photos justificatives (3 angles recommandés)
              </span>
              <button
                type="button"
                onClick={handleSimulatePhotos}
                className="text-xs text-amber-800 hover:text-amber-950 font-bold bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Remplir avec photos types</span>
              </button>
            </div>

            {/* Photo Upload Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Photo 1 */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex flex-col items-center justify-between min-h-[160px] text-center relative overflow-hidden">
                {photo1 ? (
                  <div className="relative w-full h-full flex flex-col items-center">
                    <img src={photo1} alt="Angle 1" className="w-full h-28 object-cover rounded-xl" />
                    <span className="text-[10px] font-bold text-emerald-800 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Vue d'ensemble OK
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhoto1('')}
                      className="absolute top-1 right-1 w-6 h-6 bg-slate-900/80 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 hover:bg-slate-100/60 rounded-xl transition-colors">
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">1. Vue générale</span>
                    <span className="text-[10px] text-slate-400">Équipement complet</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileUpload(1, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Photo 2 */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex flex-col items-center justify-between min-h-[160px] text-center relative overflow-hidden">
                {photo2 ? (
                  <div className="relative w-full h-full flex flex-col items-center">
                    <img src={photo2} alt="Angle 2" className="w-full h-28 object-cover rounded-xl" />
                    <span className="text-[10px] font-bold text-emerald-800 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Accessoires OK
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhoto2('')}
                      className="absolute top-1 right-1 w-6 h-6 bg-slate-900/80 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 hover:bg-slate-100/60 rounded-xl transition-colors">
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">2. Accessoires & Mallette</span>
                    <span className="text-[10px] text-slate-400">Câbles, consommables</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileUpload(2, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Photo 3 */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex flex-col items-center justify-between min-h-[160px] text-center relative overflow-hidden">
                {photo3 ? (
                  <div className="relative w-full h-full flex flex-col items-center">
                    <img src={photo3} alt="Angle 3" className="w-full h-28 object-cover rounded-xl" />
                    <span className="text-[10px] font-bold text-emerald-800 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Compteur / Usure OK
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhoto3('')}
                      className="absolute top-1 right-1 w-6 h-6 bg-slate-900/80 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 hover:bg-slate-100/60 rounded-xl transition-colors">
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">3. Usure / Numéro de série</span>
                    <span className="text-[10px] text-slate-400">Marques existantes</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileUpload(3, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Checklist: Propreté & Fonctionnement */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Constat contradictoire
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">État de propreté :</label>
                  <select
                    value={cleanliness}
                    onChange={(e) => setCleanliness(e.target.value as any)}
                    className="w-full h-11 px-3 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="impeccable">Impeccable / Nettoyé</option>
                    <option value="correct">Correct / Traces d'usage normales</option>
                    <option value="a_nettoyer">Poussiéreux / À nettoyer</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Test de fonctionnement :</label>
                  <select
                    value={functionalStatus}
                    onChange={(e) => setFunctionalStatus(e.target.value as any)}
                    className="w-full h-11 px-3 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="conforme">100% Fonctionnel · Testé ensemble</option>
                    <option value="remarque">Fonctionnel avec remarque mineure</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Observations complémentaires (facultatif) :
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Légère rayure superficielle sur le carter gauche, sans impact..."
                  className="w-full h-11 px-3.5 text-xs text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Validation Checkbox */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={validatedByBoth}
                  onChange={(e) => setValidatedByBoth(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  required
                />
                <span className="text-xs text-slate-700">
                  <strong>Validation contradictoire en face-à-face :</strong> Le propriétaire et le locataire attestent ensemble de l'exactitude de ces photos et de l'état du matériel à la date et heure d'enregistrement.
                </span>
              </label>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={!validatedByBoth}
                className={`px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  type === 'check_in'
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {type === 'check_in'
                    ? "Valider le départ & Activer la caution Stripe"
                    : "Valider le retour & Libérer la caution Stripe"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
