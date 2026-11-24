import { supabase } from './supabase';

/**
 * MATIK — Service des états des lieux vidéo horodatés.
 *
 * Les vidéos vivent dans le bucket Supabase Storage `inspection-videos` et les
 * métadonnées dans `public.video_inspections` (migration 08).
 *
 * La page de partage ne lit jamais la table directement : elle passe par les
 * fonctions `get_video_inspection` / `validate_video_inspection`, qui n'exposent
 * qu'une ligne lorsque l'identifiant UUID est connu.
 */

export const INSPECTION_VIDEOS_BUCKET = 'inspection-videos';

export type VideoInspectionCategory =
  | 'logement'
  | 'outillage'
  | 'evenementiel'
  | 'vehicule'
  | 'autre';

export type VideoInspectionType = 'entree' | 'sortie';

export interface VideoInspection {
  id: string;
  item_title: string;
  category: VideoInspectionCategory;
  inspection_type: VideoInspectionType;
  notes: string | null;
  video_url: string;
  video_mime_type: string | null;
  video_duration_seconds: number | null;
  server_timestamp: string;
  timezone: string | null;
  location_label: string | null;
  location_lat: number | null;
  location_lng: number | null;
  client_validated_at: string | null;
  created_at: string;
}

export interface VideoInspectionDraft {
  itemTitle: string;
  category: VideoInspectionCategory;
  inspectionType: VideoInspectionType;
  notes?: string;
  timezone: string;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  videoBlob: Blob;
  mimeType: string;
  durationSeconds: number;
}

/** Préremplissage depuis une réservation ou une annonce du tableau de bord. */
export interface VideoInspectionPrefill {
  itemTitle?: string;
  category?: VideoInspectionCategory;
  inspectionType?: VideoInspectionType;
  notes?: string;
}

export const VIDEO_INSPECTION_CATEGORY_LABELS: Record<VideoInspectionCategory, string> = {
  logement: 'Logement (appartement / maison)',
  outillage: 'Outillage & BTP',
  evenementiel: 'Événementiel / Hi-Fi',
  vehicule: 'Véhicule',
  autre: 'Autre',
};

export const VIDEO_INSPECTION_TYPE_LABELS: Record<VideoInspectionType, string> = {
  entree: 'Entrée / Avant (DÉPART)',
  sortie: 'Sortie / Retour (RETOUR)',
};

export const VIDEO_INSPECTION_TYPE_SHORT: Record<VideoInspectionType, string> = {
  entree: 'DÉPART',
  sortie: 'RETOUR',
};

/** Génère un UUID v4 même hors contexte sécurisé. */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Récupère l'heure serveur et renvoie le décalage à appliquer à `Date.now()`.
 * Repli silencieux sur l'horloge locale si l'API n'est pas joignable (dev).
 */
export async function getServerTimeOffset(): Promise<number> {
  const sentAt = Date.now();

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);

    const response = await fetch('/api/time', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    window.clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const serverTime = Date.parse(data?.iso);
      if (Number.isFinite(serverTime)) {
        // Compense approximativement la moitié de la latence réseau.
        const roundTrip = Date.now() - sentAt;
        return serverTime + roundTrip / 2 - Date.now();
      }
    }
  } catch {
    // API indisponible (mode dev sans serveur) : on continue avec l'heure locale.
  }

  return 0;
}

/**
 * MIME de base sans paramètres de codec.
 * MediaRecorder renvoie par exemple « video/webm;codecs=vp9,opus » : le bucket
 * Supabase n'accepte que des types normalisés (« video/webm »).
 */
const normalizeMimeType = (mimeType: string): string => {
  const base = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (base === 'video/mp4' || base === 'video/quicktime' || base === 'video/webm') return base;
  return 'video/webm';
};

/** Téléverse la vidéo et renvoie son URL publique non listée. */
export async function uploadInspectionVideo(
  blob: Blob,
  mimeType: string
): Promise<{ path: string; publicUrl: string; contentType: string }> {
  const contentType = normalizeMimeType(mimeType);
  const extension =
    contentType === 'video/mp4' ? 'mp4' : contentType === 'video/quicktime' ? 'mov' : 'webm';
  const dateFolder = new Date().toISOString().slice(0, 10);
  const path = `${dateFolder}/${generateId()}.${extension}`;

  const { error } = await supabase.storage
    .from(INSPECTION_VIDEOS_BUCKET)
    .upload(path, blob, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? "Le stockage des vidéos n'est pas encore configuré (migration 08 à exécuter)."
        : `Envoi de la vidéo impossible : ${error.message}`
    );
  }

  const { data } = supabase.storage.from(INSPECTION_VIDEOS_BUCKET).getPublicUrl(path);

  return { path, publicUrl: data.publicUrl, contentType };
}

/** Publie l'état des lieux : vidéo + métadonnées horodatées. */
export async function createVideoInspection(
  draft: VideoInspectionDraft
): Promise<{ id: string; videoUrl: string }> {
  const upload = await uploadInspectionVideo(draft.videoBlob, draft.mimeType);

  const id = generateId();

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id || null;
  } catch {
    userId = null;
  }

  const { error } = await supabase.from('video_inspections').insert({
    id,
    user_id: userId,
    item_title: draft.itemTitle.trim(),
    category: draft.category,
    inspection_type: draft.inspectionType,
    notes: draft.notes?.trim() || null,
    video_url: upload.publicUrl,
    video_path: upload.path,
    video_mime_type: upload.contentType,
    video_duration_seconds: Math.round(draft.durationSeconds * 10) / 10,
    timezone: draft.timezone || null,
    location_label: draft.locationLabel || null,
    location_lat: draft.locationLat ?? null,
    location_lng: draft.locationLng ?? null,
  });

  if (error) {
    // La vidéo est déjà envoyée : on nettoie pour ne pas laisser d'orphelin.
    try {
      await supabase.storage.from(INSPECTION_VIDEOS_BUCKET).remove([upload.path]);
    } catch {}

    throw new Error(`Enregistrement de l'état des lieux impossible : ${error.message}`);
  }

  return { id, videoUrl: upload.publicUrl };
}

/** Charge un état des lieux par son identifiant de partage. */
export async function fetchVideoInspection(id: string): Promise<VideoInspection | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const { data, error } = await supabase.rpc('get_video_inspection', { p_id: id });

  if (error) {
    console.warn('[Video inspections] Lecture impossible :', error.message);
    return null;
  }

  const rows = (data || []) as VideoInspection[];
  return rows[0] || null;
}

/** Enregistre la validation client (idempotent) et renvoie la date retenue. */
export async function validateVideoInspection(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('validate_video_inspection', { p_id: id });

  if (error) {
    console.warn('[Video inspections] Validation impossible :', error.message);
    return null;
  }

  return typeof data === 'string' ? data : null;
}

/** Liste les états des lieux du compte connecté (RLS propriétaire). */
export async function fetchMyVideoInspections(): Promise<VideoInspection[]> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return [];

    const { data, error } = await supabase
      .from('video_inspections')
      .select(
        'id,item_title,category,inspection_type,notes,video_url,video_mime_type,video_duration_seconds,server_timestamp,timezone,location_label,location_lat,location_lng,client_validated_at,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('[Video inspections] Liste indisponible :', error.message);
      return [];
    }

    return (data || []) as unknown as VideoInspection[];
  } catch (error) {
    console.warn('[Video inspections] Exception liste :', error);
    return [];
  }
}

/** URL publique de partage d'un état des lieux. */
export function buildInspectionShareUrl(id: string): string {
  return `${window.location.origin}/etat-des-lieux/${id}`;
}

/** Libellé lisible de l'horodatage serveur (fuseau de l'utilisateur). */
export function formatInspectionDate(value: string, timezone?: string | null): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone || undefined,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString('fr-FR');
  }
}
