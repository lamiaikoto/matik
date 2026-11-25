import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  LocateFixed,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Square,
  SwitchCamera,
  UploadCloud,
  Video,
} from 'lucide-react';
import {
  VIDEO_INSPECTION_CATEGORY_LABELS,
  VIDEO_INSPECTION_TYPE_SHORT,
  VideoInspection,
  VideoInspectionCategory,
  VideoInspectionPrefill,
  VideoInspectionType,
  buildInspectionShareUrl,
  createVideoInspection,
  getServerTimeOffset,
  replaceInspectionVideo,
} from '../lib/videoInspectionService';

export interface VideoInspectionStudioProps {
  prefill?: VideoInspectionPrefill | null;
  /** Appelé après publication, pour rafraîchir la liste « mes états des lieux ». */
  onPublished?: () => void;
  /**
   * Refaite d'un état des lieux NON validé : la nouvelle vidéo remplace l'ancienne
   * via l'API service_role. La validation client bloque toute modification.
   */
  existingInspection?: VideoInspection | null;
  /** Appelé après un remplacement réussi. */
  onReplaced?: () => void;
}

type CameraState = 'idle' | 'starting' | 'ready' | 'error';
type LocationState = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported';

interface GeoLocation {
  label: string;
  lat: number;
  lng: number;
}

interface RecordedClip {
  blob: Blob;
  url: string;
  mimeType: string;
  durationSeconds: number;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const MAX_DURATION_OPTIONS = [30, 45, 60] as const;

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=h264,aac',
  'video/mp4',
];

const pickMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return '';
};

const formatCounter = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const timezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
};

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
): number => {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = word;
      if (lines >= maxLines) return lines;
    } else {
      line = candidate;
    }
  }

  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight);
    lines += 1;
  }

  return lines;
};

export const VideoInspectionStudio: React.FC<VideoInspectionStudioProps> = ({
  prefill,
  onPublished,
  existingInspection = null,
  onReplaced,
}) => {
  const lockedAfterValidation = Boolean(existingInspection?.client_validated_at);

  const [itemTitle, setItemTitle] = useState(prefill?.itemTitle || existingInspection?.item_title || '');
  const [category, setCategory] = useState<VideoInspectionCategory>(
    prefill?.category || existingInspection?.category || 'logement'
  );
  const [inspectionType, setInspectionType] = useState<VideoInspectionType>(
    prefill?.inspectionType || existingInspection?.inspection_type || 'entree'
  );
  const [notes, setNotes] = useState(prefill?.notes || existingInspection?.notes || '');
  const [maxDuration, setMaxDuration] = useState<number>(45);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recorded, setRecorded] = useState<RecordedClip | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('idle');

  const [published, setPublished] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const dateCacheRef = useRef<{ key: number; label: string; tz: string }>({ key: -1, label: '', tz: '' });
  const stateRef = useRef({ itemTitle, category, inspectionType, location, isRecording, maxDuration });

  stateRef.current = { itemTitle, category, inspectionType, location, isRecording, maxDuration };

  const clearRecorded = useCallback(() => {
    setRecorded((previous) => {
      if (previous?.url) URL.revokeObjectURL(previous.url);
      return null;
    });
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setCameraState('idle');
  }, []);

  // ── Rendu temps réel sur le canvas (aperçu + bandeau incrusté) ────────────
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { itemTitle: title, inspectionType: type, location: loc, isRecording: recording, maxDuration: max } =
      stateRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (video.readyState >= 2 && video.videoWidth > 0) {
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;
      let sw = video.videoWidth;
      let sh = video.videoHeight;
      let sx = 0;
      let sy = 0;

      if (videoRatio > canvasRatio) {
        sw = video.videoHeight * canvasRatio;
        sx = (video.videoWidth - sw) / 2;
      } else {
        sh = video.videoWidth / canvasRatio;
        sy = (video.videoHeight - sh) / 2;
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    // Assombrissement haut / bas pour garantir la lisibilité du bandeau.
    const topGradient = ctx.createLinearGradient(0, 0, 0, 180);
    topGradient.addColorStop(0, 'rgba(2, 6, 23, 0.86)');
    topGradient.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, canvas.width, 180);

    const bottomGradient = ctx.createLinearGradient(0, canvas.height - 280, 0, canvas.height);
    bottomGradient.addColorStop(0, 'rgba(2, 6, 23, 0)');
    bottomGradient.addColorStop(0.35, 'rgba(2, 6, 23, 0.78)');
    bottomGradient.addColorStop(1, 'rgba(2, 6, 23, 0.94)');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, canvas.height - 280, canvas.width, 280);

    // ── Marque Matikilou + mention ──
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    drawRoundRect(ctx, 32, 30, 430, 84, 18);
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('MATIKILOU', 54, 76);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ÉTAT DES LIEUX VIDÉO HORODATÉ', 54, 100);

    // ── Badge DÉPART / RETOUR ──
    const badge = VIDEO_INSPECTION_TYPE_SHORT[type];
    ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const badgeWidth = ctx.measureText(badge).width + 56;
    ctx.fillStyle = type === 'entree' ? '#F59E0B' : '#FFFFFF';
    drawRoundRect(ctx, canvas.width - badgeWidth - 32, 42, badgeWidth, 58, 14);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.textAlign = 'center';
    ctx.fillText(badge, canvas.width - badgeWidth / 2 - 32, 81);
    ctx.textAlign = 'left';

    // ── Indicateur REC + compteur ──
    if (recording) {
      const seconds = Math.min(max, Math.max(0, (performance.now() - startTsRef.current) / 1000));
      const label = `REC ${formatCounter(seconds)} / ${formatCounter(max)}`;

      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      const recWidth = ctx.measureText(label).width + 64;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
      drawRoundRect(ctx, canvas.width / 2 - recWidth / 2, 44, recWidth, 50, 12);
      ctx.fill();

      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(canvas.width / 2 - recWidth / 2 + 24, 69, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, canvas.width / 2 - recWidth / 2 + 42, 77);
    }

    // ── Bandeau bas : bien, date/heure, lieu ──
    const nowMs = Date.now() + offsetRef.current;
    const secondKey = Math.floor(nowMs / 1000);

    // Le libellé n'est recalculé qu'une fois par seconde (Intl est coûteux).
    if (dateCacheRef.current.key !== secondKey) {
      const now = new Date(nowMs);
      const zone = timezone();
      let label = now.toLocaleString('fr-FR');
      try {
        label = new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'full',
          timeStyle: 'medium',
          timeZone: zone,
        }).format(now);
      } catch {}
      dateCacheRef.current = { key: secondKey, label, tz: zone };
    }

    const dateLabel = dateCacheRef.current.label;
    const tzLabel = dateCacheRef.current.tz;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const titleLines = drawWrappedText(
      ctx,
      title || 'Bien sans nom',
      54,
      canvas.height - 152,
      canvas.width - 108,
      42,
      2
    );

    const dateY = canvas.height - 152 + titleLines * 42 + 14;

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`🕒 ${dateLabel} · ${tzLabel}`, 54, dateY);

    ctx.fillStyle = loc ? '#FDE68A' : '#CBD5E1';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      loc ? `📍 ${loc.label}` : '📍 Localisation non partagée',
      54,
      dateY + 34
    );

    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `Horodatage synchronisé · ${VIDEO_INSPECTION_CATEGORY_LABELS[stateRef.current.category]}`,
      canvas.width - 54,
      canvas.height - 26
    );
    ctx.textAlign = 'left';
  }, []);

  const startRenderLoop = useCallback(() => {
    if (rafRef.current !== null) return;

    const loop = () => {
      renderFrame();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [renderFrame]);

  // ── Géolocalisation optionnelle ───────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationState('unsupported');
      return;
    }

    setLocationState('pending');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=fr`,
            { headers: { Accept: 'application/json' } }
          );

          if (response.ok) {
            const geo = await response.json();
            const city = geo?.city || geo?.locality || geo?.principalSubdivision || '';
            if (city) {
              label = `${city}${geo?.countryCode ? ` (${geo.countryCode})` : ''} · ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
            }
          }
        } catch {
          // Géocodage inverse indisponible : coordonnées brutes suffisantes.
        }

        setLocation({ label, lat, lng });
        setLocationState('granted');
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // ── Caméra ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error');
        setError("Votre navigateur ne permet pas l'accès à la caméra. Utilisez Chrome, Safari ou Firefox récent.");
        return false;
      }

      setCameraState('starting');
      setError(null);

      try {
        stopStream();
        setCameraState('starting');

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
        } catch (firstError: any) {
          // Certains ordinateurs n'ont pas de caméra arrière : repli générique.
          if (firstError?.name === 'OverconstrainedError' || firstError?.name === 'NotFoundError') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } else {
            throw firstError;
          }
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        setCameraState('ready');
        startRenderLoop();

        if (locationState === 'idle') requestLocation();

        return true;
      } catch (err: any) {
        const name = err?.name || '';
        setCameraState('error');
        setError(
          name === 'NotAllowedError'
            ? "L'accès à la caméra et au micro a été refusé. Autorisez-les dans les réglages du navigateur, puis réessayez."
            : name === 'NotFoundError'
            ? 'Aucune caméra détectée sur cet appareil.'
            : "La caméra n'a pas pu démarrer. Vérifiez qu'aucune autre application ne l'utilise."
        );
        return false;
      }
    },
    [facingMode, locationState, requestLocation, startRenderLoop, stopStream]
  );

  const handleSwitchCamera = useCallback(async () => {
    if (isRecording) return;
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (cameraState === 'ready') {
      await startCamera(next);
    }
  }, [cameraState, facingMode, isRecording, startCamera]);

  // ── Enregistrement ────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    recorderRef.current = null;

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!itemTitle.trim()) {
      setError('Renseignez le nom du bien ou de l’objet avant de filmer.');
      return;
    }

    setIsPreparing(true);
    setError(null);
    setNotice(null);
    clearRecorded();
    setPublished(null);
    setCopied(false);

    try {
      const ready = streamRef.current ? true : await startCamera();
      if (!ready || !streamRef.current) return;

      if (typeof MediaRecorder === 'undefined' || !canvasRef.current) {
        setError("L'enregistrement vidéo n'est pas pris en charge par ce navigateur.");
        return;
      }

      if (typeof canvasRef.current.captureStream !== 'function') {
        setError(
          "Ce navigateur ne permet pas d'incruster le bandeau horodaté dans la vidéo. Utilisez Chrome, Edge ou un Safari récent."
        );
        return;
      }

      offsetRef.current = await getServerTimeOffset();

      const canvasStream = canvasRef.current.captureStream(30);
      streamRef.current.getAudioTracks().forEach((track) => canvasStream.addTrack(track));

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        canvasStream,
        mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : { videoBitsPerSecond: 2_500_000 }
      );

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = mimeType || recorder.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        const durationSeconds = Math.min(
          stateRef.current.maxDuration,
          Math.max(0.5, (performance.now() - startTsRef.current) / 1000)
        );

        if (blob.size > 0) {
          setRecorded({
            blob,
            url: URL.createObjectURL(blob),
            mimeType: type,
            durationSeconds,
          });
        }
      };

      startTsRef.current = performance.now();
      setElapsed(0);
      setIsRecording(true);
      recorder.start(1000);

      timerRef.current = window.setInterval(() => {
        const seconds = (performance.now() - startTsRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= stateRef.current.maxDuration) {
          stopRecording();
        }
      }, 200);
    } catch (err: any) {
      setError(err?.message || "L'enregistrement n'a pas pu démarrer.");
      setIsRecording(false);
    } finally {
      setIsPreparing(false);
    }
  }, [clearRecorded, itemTitle, startCamera, stopRecording]);

  const resetAll = useCallback(() => {
    clearRecorded();
    setPublished(null);
    setElapsed(0);
    setNotice(null);
    setError(null);
    setCopied(false);
  }, [clearRecorded]);

  const handlePublish = useCallback(async () => {
    if (!recorded) return;
    if (lockedAfterValidation) {
      setError('Cet état des lieux est validé par le client : la vidéo ne peut plus être modifiée. Seule la suppression est possible.');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      // Mode refaite avant validation client : remplacement via l'API.
      if (existingInspection && !existingInspection.client_validated_at) {
        const rep = await replaceInspectionVideo({
          id: existingInspection.id,
          itemTitle,
          category,
          inspectionType,
          notes,
          videoBlob: recorded.blob,
          mimeType: recorded.mimeType,
          durationSeconds: recorded.durationSeconds,
        });
        if (!rep.success) {
          throw new Error(rep.error || 'Le remplacement de la vidéo a échoué.');
        }
        setPublished({ id: existingInspection.id, url: buildInspectionShareUrl(existingInspection.id) });
        setNotice('Vidéo remplacée avant la validation du client.');
        onReplaced?.();
        stopStream();
        return;
      }

      const result = await createVideoInspection({
        itemTitle,
        category,
        inspectionType,
        notes,
        timezone: timezone(),
        locationLabel: location?.label || null,
        locationLat: location?.lat ?? null,
        locationLng: location?.lng ?? null,
        videoBlob: recorded.blob,
        mimeType: recorded.mimeType,
        durationSeconds: recorded.durationSeconds,
      });

      setPublished({ id: result.id, url: buildInspectionShareUrl(result.id) });
      onPublished?.();
      stopStream();
    } catch (err: any) {
      setError(err?.message || "La publication de l'état des lieux a échoué.");
    } finally {
      setIsPublishing(false);
    }
  }, [
    category,
    existingInspection,
    inspectionType,
    itemTitle,
    location,
    lockedAfterValidation,
    notes,
    onPublished,
    onReplaced,
    recorded,
    stopStream,
  ]);

  const handleCopy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setNotice('Lien copié. Vous pouvez le coller dans un SMS, WhatsApp, e-mail ou la messagerie Matik.');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Copie automatique impossible : sélectionnez le lien ci-dessous pour le copier manuellement.');
    }
  }, []);

  // Nettoyage à la destruction du composant.
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const prefillKeyRef = useRef<string>('');

  useEffect(() => {
    const key = prefill ? JSON.stringify(prefill) : '';
    if (key === prefillKeyRef.current) return;
    prefillKeyRef.current = key;

    if (!prefill) {
      // Ouverture « vierge » depuis le menu : formulaire remis à zéro.
      setItemTitle('');
      setNotes('');
      setCategory('logement');
      setInspectionType('entree');
      return;
    }

    if (prefill.itemTitle) setItemTitle(prefill.itemTitle);
    if (prefill.category) setCategory(prefill.category);
    if (prefill.inspectionType) setInspectionType(prefill.inspectionType);
    setNotes(prefill.notes || '');
  }, [prefill]);

  const remaining = Math.max(0, maxDuration - elapsed);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 sm:px-7 py-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-950">Studio d’état des lieux vidéo</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
              Bandeau horodaté incrusté dans l’image, caméra arrière par défaut, sans installation.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Horodatage serveur
        </span>
      </div>

      {lockedAfterValidation && existingInspection && (
        <div className="mx-5 sm:mx-7 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-800">
          <strong>Preuve validée par le client.</strong> La vidéo ne peut plus être modifiée ni remplacée afin de
          conserver la preuve intacte. Seule la suppression (liste des états des lieux ou page de partage) est
          autorisée.
        </div>
      )}

      <div className="p-5 sm:p-7 space-y-6">
        {/* ── Formulaire ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label htmlFor="inspection-title" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Nom du bien ou de l’objet loué <span className="text-amber-600">*</span>
            </label>
            <input
              id="inspection-title"
              type="text"
              value={itemTitle}
              maxLength={160}
              onChange={(event) => setItemTitle(event.target.value)}
              placeholder="Ex. Appartement T2 Rue de la Paix, Shampouineuse Karcher…"
              disabled={isRecording || isPublishing}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors disabled:bg-slate-50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inspection-category" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Catégorie
            </label>
            <select
              id="inspection-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as VideoInspectionCategory)}
              disabled={isRecording || isPublishing}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors disabled:bg-slate-50"
            >
              {(Object.keys(VIDEO_INSPECTION_CATEGORY_LABELS) as VideoInspectionCategory[]).map((key) => (
                <option key={key} value={key}>
                  {VIDEO_INSPECTION_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inspection-type" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Moment de l’état des lieux
            </label>
            <select
              id="inspection-type"
              value={inspectionType}
              onChange={(event) => setInspectionType(event.target.value as VideoInspectionType)}
              disabled={isRecording || isPublishing}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors disabled:bg-slate-50"
            >
              <option value="entree">Entrée / Avant (DÉPART)</option>
              <option value="sortie">Sortie / Retour (RETOUR)</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label htmlFor="inspection-notes" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Notes / observations rapides <span className="font-normal text-slate-400 normal-case">(facultatif)</span>
            </label>
            <textarea
              id="inspection-notes"
              value={notes}
              maxLength={2000}
              rows={2}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex. Clés remises dans la boîte à code, légère trace sur le mur du salon…"
              disabled={isRecording || isPublishing}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors disabled:bg-slate-50"
            />
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              {MAX_DURATION_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMaxDuration(value)}
                  disabled={isRecording || isPublishing}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    maxDuration === value
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {value} s
                </button>
              ))}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                locationState === 'granted'
                  ? 'text-emerald-700'
                  : locationState === 'denied'
                  ? 'text-slate-500'
                  : 'text-slate-500'
              }`}
            >
              <LocateFixed className="w-3.5 h-3.5" />
              {locationState === 'granted' && location
                ? location.label
                : locationState === 'pending'
                ? 'Localisation en cours…'
                : locationState === 'denied'
                ? 'Localisation refusée (non bloquant)'
                : locationState === 'unsupported'
                ? 'Localisation indisponible'
                : 'Géolocalisation optionnelle'}
            </span>
          </div>
        </div>

        {/* ── Zone vidéo ── */}
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-900 aspect-video">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className={`w-full h-full object-contain ${cameraState === 'ready' || isRecording ? '' : 'hidden'}`}
            />
            <video ref={videoRef} playsInline muted className="hidden" />

            {cameraState !== 'ready' && !isRecording && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                  {cameraState === 'starting' ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : cameraState === 'error' ? (
                    <CameraOff className="w-6 h-6 text-red-400" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {cameraState === 'starting'
                      ? 'Démarrage de la caméra…'
                      : 'Caméra prête à filmer'}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Le bandeau Matikilou, la date/heure serveur et le lieu seront incrustés directement
                    dans la vidéo.
                  </p>
                </div>
                {cameraState !== 'starting' && (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Activer la caméra
                  </button>
                )}
              </div>
            )}

            {isRecording && (
              <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/90 text-white text-[11px] font-bold tabular-nums">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {formatCounter(elapsed)} / {formatCounter(maxDuration)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={isPreparing || isPublishing || Boolean(recorded) || lockedAfterValidation}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                {lockedAfterValidation
                  ? 'Vidéo verrouillée après validation'
                  : isPreparing
                    ? 'Synchronisation…'
                    : 'Démarrer l’enregistrement'}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4" />
                Arrêter ({formatCounter(remaining)} restantes)
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleSwitchCamera()}
              disabled={isRecording || isPublishing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SwitchCamera className="w-4 h-4" />
              Caméra {facingMode === 'environment' ? 'arrière' : 'avant'}
            </button>

            {recorded && !isRecording && !lockedAfterValidation && (
              <button
                type="button"
                onClick={resetAll}
                disabled={isPublishing}
                title="Supprime la prise en cours et relance la caméra avant publication"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Recommencer la prise
              </button>
            )}

            <span className="text-[11px] text-slate-500 ml-auto">
              {isRecording
                ? 'La vidéo s’arrête automatiquement à la limite choisie.'
                : recorded
                ? `Séquence de ${recorded.durationSeconds.toFixed(1)} s prête à être publiée.`
                : 'Astuce : filmez chaque pièce / face de l’objet en un seul plan.'}
            </span>
          </div>

          {recorded && !published && (
            <div className="space-y-3 pt-2">
              <video
                src={recorded.url}
                controls
                playsInline
                className="w-full max-h-80 rounded-2xl bg-black border border-slate-900"
              />
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={isPublishing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
              >
                {isPublishing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                {isPublishing ? 'Envoi de la vidéo…' : existingInspection && !existingInspection.client_validated_at
                  ? 'Remplacer la vidéo avant validation client'
                  : 'Valider et générer le lien client'}
              </button>
            </div>
          )}
        </div>

        {/* ── Messages ── */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[12px] text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && !error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[12px] text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* ── Publication réussie ── */}
        {published && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-950">État des lieux publié</h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Partagez ce lien privé (non listé) avec votre client. Il pourra visionner la vidéo et
                  valider l’état des lieux en un clic, sans créer de compte.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-emerald-200 px-3 py-2.5 text-[11px] font-mono text-slate-700 break-all">
              {published.url}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => void handleCopy(published.url)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Lien copié' : 'Copier le lien pour le client'}
              </button>
              <a
                href={`/etat-des-lieux/${published.id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir la page de partage
              </a>
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Réaliser un autre état des lieux
            </button>
          </div>
        )}

        {/* ── Rappel des garanties ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { icon: ShieldCheck, title: 'Horodatage serveur', text: 'Heure synchronisée, fuseau et date incrustés.' },
            { icon: MapPin, title: 'Lieu optionnel', text: 'Géolocalisation facultative, jamais bloquante.' },
            { icon: Video, title: 'Lien non listé', text: 'Accessible uniquement par son URL privée.' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
              <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-800">
                <item.icon className="w-3.5 h-3.5 text-amber-600" />
                {item.title}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
