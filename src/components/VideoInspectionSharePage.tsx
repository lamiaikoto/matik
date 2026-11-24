import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Film,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  Tag,
  Video,
} from 'lucide-react';
import { MatikLogo } from './MatikLogo';
import {
  VIDEO_INSPECTION_CATEGORY_LABELS,
  VIDEO_INSPECTION_TYPE_SHORT,
  VideoInspection,
  buildInspectionShareUrl,
  fetchVideoInspection,
  formatInspectionDate,
  validateVideoInspection,
} from '../lib/videoInspectionService';

export interface VideoInspectionSharePageProps {
  id: string;
  onNavigateHome: () => void;
}

const copyText = async (value: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

export const VideoInspectionSharePage: React.FC<VideoInspectionSharePageProps> = ({
  id,
  onNavigateHome,
}) => {
  const [inspection, setInspection] = useState<VideoInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const row = await fetchVideoInspection(id);
      if (cancelled) return;

      if (!row) {
        setError(
          "Cet état des lieux est introuvable. Vérifiez que le lien est complet, ou demandez un nouveau lien à la personne qui vous l'a envoyé."
        );
      } else {
        setInspection(row);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(buildInspectionShareUrl(id));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  }, [id]);

  const handleValidate = useCallback(async () => {
    if (!inspection || inspection.client_validated_at) return;

    const confirmed = window.confirm(
      "Confirmez-vous avoir visionné cette vidéo et accepter l'état des lieux tel qu'il est décrit ? Cette validation sera horodatée."
    );
    if (!confirmed) return;

    setValidating(true);
    setValidationError(null);

    const validatedAt = await validateVideoInspection(inspection.id);

    if (!validatedAt) {
      setValidationError('La validation n’a pas pu être enregistrée. Réessayez dans quelques instants.');
      setValidating(false);
      return;
    }

    setInspection((current) => (current ? { ...current, client_validated_at: validatedAt } : current));
    setValidating(false);
  }, [inspection]);

  const isValidated = Boolean(inspection?.client_validated_at);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* En-tête minimal, sans navigation marchande */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <MatikLogo size="sm" onClick={onNavigateHome} />
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            <Video className="w-3.5 h-3.5 text-amber-600" />
            État des lieux vidéo
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Aller sur Matikilou
        </button>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs font-semibold">Chargement de l’état des lieux…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 space-y-3 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <h1 className="text-sm font-black text-red-900">Lien indisponible</h1>
            <p className="text-xs text-red-800 leading-relaxed max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Retour à l’accueil
            </button>
          </div>
        )}

        {!loading && inspection && (
          <>
            {/* Bandeau titre + statut */}
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 sm:px-7 py-5 border-b border-slate-200 bg-slate-950 text-white space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-widest">
                    <Film className="w-3 h-3" />
                    {VIDEO_INSPECTION_TYPE_SHORT[inspection.inspection_type]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[10px] font-bold text-slate-200">
                    <Tag className="w-3 h-3 text-amber-300" />
                    {VIDEO_INSPECTION_CATEGORY_LABELS[inspection.category]}
                  </span>
                  {isValidated ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Validé par le client
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[10px] font-bold text-slate-200">
                      <Clock className="w-3 h-3 text-amber-300" />
                      En attente de validation
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  {inspection.item_title}
                </h1>
              </div>

              {/* Lecteur vidéo : le bandeau date/heure est incrusté dans l'image */}
              <div className="bg-black">
                <video
                  src={inspection.video_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[70vh] bg-black"
                >
                  Votre navigateur ne permet pas la lecture vidéo.
                </video>
              </div>

              <div className="px-5 sm:px-7 py-5 space-y-5">
                {/* Horodatage certifié */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-900">
                    <ShieldCheck className="w-4 h-4" />
                    Horodatage serveur certifié
                  </div>
                  <p className="text-sm font-bold text-slate-950">
                    {formatInspectionDate(inspection.server_timestamp, inspection.timezone)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      Fuseau : {inspection.timezone || 'Europe/Paris'}
                    </span>
                    {inspection.location_label && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-700" />
                        {inspection.location_label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Cette date provient de l’infrastructure Matikilou (et non de l’horloge du téléphone).
                    Elle est également incrustée dans la vidéo.
                  </p>
                </div>

                {inspection.notes && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      Notes / observations
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {inspection.notes}
                    </p>
                  </div>
                )}

                {/* Partage */}
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    Lien de partage
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 break-all">
                    {buildInspectionShareUrl(inspection.id)}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Lien copié' : 'Copier le lien pour le client'}
                  </button>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Envoyez ce lien par SMS, WhatsApp, e-mail ou via la messagerie de la réservation.
                    Aucun appel téléphonique n’est nécessaire.
                  </p>
                </div>

                {/* Validation client */}
                <div
                  className={`rounded-2xl border px-4 py-4 space-y-3 ${
                    isValidated
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  {isValidated ? (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-emerald-900">Validé par le client</p>
                        <p className="text-[11px] text-emerald-800">
                          Validation enregistrée le{' '}
                          {formatInspectionDate(
                            inspection.client_validated_at || inspection.server_timestamp,
                            inspection.timezone
                          )}
                        </p>
                        <p className="text-[10px] text-emerald-700 leading-relaxed">
                          Cette validation est horodatée côté serveur et ne peut plus être modifiée.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                          <CalendarCheck2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-950">
                            Confirmer et valider cet état des lieux
                          </p>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            En validant, vous attestez avoir visionné la vidéo et accepté l’état décrit.
                            La date et l’heure de votre validation seront enregistrées.
                          </p>
                        </div>
                      </div>

                      {validationError && (
                        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          {validationError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleValidate()}
                        disabled={validating}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {validating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {validating ? 'Validation en cours…' : 'Confirmer et valider cet état des lieux'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-slate-500">
                Ce lien est privé et non listé : il n’apparaît ni dans le catalogue ni dans les moteurs de
                recherche. Toute personne disposant du lien peut visionner la vidéo — transmettez-le
                uniquement aux parties concernées.
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>© {new Date().getFullYear()} Matikilou — État des lieux vidéo horodaté.</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Preuve horodatée par l’infrastructure Matik
          </span>
        </div>
      </footer>
    </div>
  );
};
