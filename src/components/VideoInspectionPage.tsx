import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Film,
  Home,
  Lock,
  MapPin,
  ScanLine,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { CurrentUser } from '../types';
import {
  VIDEO_INSPECTION_CATEGORY_LABELS,
  VIDEO_INSPECTION_TYPE_SHORT,
  VideoInspection,
  VideoInspectionPrefill,
  buildInspectionShareUrl,
  fetchMyVideoInspections,
  formatInspectionDate,
} from '../lib/videoInspectionService';
import { VideoInspectionStudio } from './VideoInspectionStudio';

export interface VideoInspectionPageProps {
  currentUser?: CurrentUser;
  prefill?: VideoInspectionPrefill | null;
  onNavigateHome: () => void;
}

const STEPS = [
  {
    icon: ScanLine,
    title: '1. Décrivez le bien',
    text: 'Nom, catégorie (logement, outillage, véhicule…) et moment : départ ou retour.',
  },
  {
    icon: Video,
    title: '2. Filmez en un plan',
    text: 'Caméra arrière par défaut, bandeau date/heure/lieu incrusté, 30 à 60 secondes.',
  },
  {
    icon: Lock,
    title: '3. Partagez le lien',
    text: 'Un lien privé non listé : le client visionne et valide sans créer de compte.',
  },
];

export const VideoInspectionPage: React.FC<VideoInspectionPageProps> = ({
  currentUser,
  prefill,
  onNavigateHome,
}) => {
  const [mine, setMine] = useState<VideoInspection[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadMine = useCallback(async () => {
    if (!currentUser) {
      setMine([]);
      return;
    }

    setLoadingMine(true);
    try {
      const rows = await fetchMyVideoInspections();
      setMine(rows);
    } finally {
      setLoadingMine(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(buildInspectionShareUrl(id));
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#F59E0B,transparent_45%),radial-gradient(circle_at_80%_0%,#FBBF24,transparent_40%)]" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l’accueil
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-12">
            <div className="flex-1 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest">
                <Film className="w-3.5 h-3.5" />
                Nouveau · preuve vidéo horodatée
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
                État des lieux vidéo
                <span className="block text-amber-400">horodaté et partageable</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Filmez un logement, une maison, une chambre, un véhicule ou du matériel. La date, l’heure
                serveur, le fuseau et le lieu sont incrustés directement dans la vidéo. Partagez ensuite un
                lien privé que votre client peut valider en un clic.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Sans annonce préalable',
                  'Mobile-first, caméra arrière',
                  '30 à 60 secondes',
                  'Validation client sans compte',
                ].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-200"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-72 rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-5 py-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Pourquoi c’est fiable ?
              </div>
              <ul className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                <li>• Heure serveur, insensible à l’horloge du téléphone.</li>
                <li>• Bandeau incrusté dans l’image, pas dans les métadonnées.</li>
                <li>• Vidéo stockée chez Supabase, lien non listé.</li>
                <li>• Validation du client horodatée et visible de tous.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* ÉTAPES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STEPS.map((step) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <step.icon className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900">{step.title}</h3>
              <p className="text-[11px] leading-relaxed text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>

        {/* STUDIO */}
        <section id="studio" className="scroll-mt-24">
          <VideoInspectionStudio prefill={prefill} onPublished={loadMine} />
        </section>

        {/* MES ÉTATS DES LIEUX */}
        {currentUser && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                Mes états des lieux récents
              </h2>
              <button
                type="button"
                onClick={() => void loadMine()}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Actualiser
              </button>
            </div>

            {loadingMine && mine.length === 0 ? (
              <p className="text-xs text-slate-500">Chargement…</p>
            ) : mine.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Aucun état des lieux enregistré sur ce compte. Votre première vidéo apparaîtra ici.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mine.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {VIDEO_INSPECTION_CATEGORY_LABELS[inspection.category]}
                        </span>
                        <h3 className="text-xs font-extrabold text-slate-950 truncate">
                          {inspection.item_title}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          inspection.inspection_type === 'entree'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        {VIDEO_INSPECTION_TYPE_SHORT[inspection.inspection_type]}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500">
                      <p>{formatInspectionDate(inspection.server_timestamp, inspection.timezone)}</p>
                      {inspection.location_label && (
                        <p className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          {inspection.location_label}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {inspection.client_validated_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Validé client
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500">
                          En attente de validation
                        </span>
                      )}

                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleCopy(inspection.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedId === inspection.id ? 'Copié' : 'Lien'}
                        </button>
                        <a
                          href={`/etat-des-lieux/${inspection.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] font-bold text-white transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ouvrir
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* USAGES */}
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
              Pensé pour tous les biens loués
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed text-slate-600">
            <p>
              <strong className="text-slate-900">Immobilier :</strong> appartements, maisons, chambres,
              locations saisonnières. Filmez l’entrée pièce par pièce et l’état du mobilier.
            </p>
            <p>
              <strong className="text-slate-900">Matériel & outillage :</strong> shampooineuse, perceuse,
              nacelle, matériel de chantier. Montrez l’état, les accessoires et les numéros de série.
            </p>
            <p>
              <strong className="text-slate-900">Véhicules :</strong> carrosserie, jantes, compteur,
              intérieur, niveau de carburant. Idéal avant et après chaque location.
            </p>
            <p>
              <strong className="text-slate-900">Événementiel / Hi-Fi :</strong> sonorisation, mobilier,
              vaisselle. Le lien vidéo remplace les longues listes de photos.
            </p>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-200 pt-3">
            L’outil est utilisable librement, sans publier d’annonce. Aucune coordonnée n’est affichée
            publiquement : seule la personne qui possède le lien peut visionner la vidéo.
          </p>
        </section>
      </div>
    </div>
  );
};
