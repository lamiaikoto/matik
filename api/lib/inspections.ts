/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Helpers serveur des états des lieux vidéo (F5 / workflow)
 * ════════════════════════════════════════════════════════════════════════════
 * Les routes `/api/inspections/*` écrivent avec la clé `service_role` :
 *   - la table `video_inspections` n'a pas de politique UPDATE client ;
 *   - le bucket `inspection-videos` applique des préfixes de dossier et un
 *     plafond de 50 Mo (migration 11) ;
 *   - la validation client (RPC) et la suppression restent les seules
 *     opérations possibles une fois `client_validated_at` renseigné.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError, getSupabaseAdmin, getBearerToken } from './bookingSecurity';

export const INSPECTION_BUCKET = 'inspection-videos';

export interface InspectionRow {
  id: string;
  user_id: string | null;
  item_title: string;
  category: string;
  inspection_type: string;
  notes: string | null;
  video_url: string;
  video_path: string | null;
  video_mime_type: string | null;
  video_duration_seconds: number | null;
  client_validated_at: string | null;
  replaced_at: string | null;
  created_at: string;
}

/** Supabase admin dédié (même client que le reste de l'API, mis en cache). */
export const getInspectionAdmin = (): SupabaseClient => getSupabaseAdmin();

/** Extrait le chemin Storage depuis une URL publique ou une valeur de chemin. */
export const extractStoragePath = (row: Pick<InspectionRow, 'video_path' | 'video_url'>): string | null => {
  if (row.video_path && !row.video_path.startsWith('http')) return row.video_path;

  const url = row.video_url || '';
  const marker = `/public/${INSPECTION_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  let path = url.slice(idx + marker.length);
  try {
    path = decodeURIComponent(path);
  } catch {
    // Conserve le chemin brut si l'URL n'est pas encodée.
  }
  return path || null;
};

/** Supprime l'objet Storage d'une vidéo (ignoré si déjà absent). */
export const removeInspectionVideoObject = async (
  admin: SupabaseClient,
  row: Pick<InspectionRow, 'video_path' | 'video_url'>
): Promise<void> => {
  const path = extractStoragePath(row);
  if (!path) return;

  try {
    const { error } = await admin.storage.from(INSPECTION_BUCKET).remove([path]);
    if (error) {
      console.warn('[Inspections] Suppression Storage impossible (déjà absent ?) :', error.message);
    }
  } catch (err: any) {
    console.warn('[Inspections] Exception suppression Storage :', err?.message || err);
  }
};

/**
 * Vérifie le porteur du jeton et autorise l'appel :
 *   - créateur connecté (row.user_id = auth.uid()) ;
 *   - ou détenteur du lien privé (aucun jeton) — le client destinataire peut
 *     aussi supprimer l'état des lieux, conformément au workflow.
 *
 * Une requête avec un jeton invalide est rejetée (401) ; un jeton valide mais
 * étranger à la ligne est rejeté (403).
 */
export const authorizeInspectionAccess = async (
  row: InspectionRow,
  req: { headers: Record<string, string | string[] | undefined> },
  { requireOwner }: { requireOwner: boolean }
): Promise<{ ownerId: string | null; anonymousLink: boolean }> => {
  const token = getBearerToken(req);

  if (!token) {
    if (requireOwner) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Connectez-vous pour refaire cet état des lieux.');
    }
    // Détenteur du lien non listé : action de suppression autorisée.
    return { ownerId: row.user_id, anonymousLink: true };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new ApiError(401, 'AUTH_INVALID', 'Session invalide ou expirée. Reconnectez-vous.');
  }

  if (row.user_id && row.user_id !== data.user.id) {
    throw new ApiError(403, 'FORBIDDEN_INSPECTION', "Vous n'êtes pas autorisé à modifier cet état des lieux.");
  }

  return { ownerId: data.user.id, anonymousLink: false };
};

/** Charge une ligne d'état des lieux depuis son identifiant UUID. */
export const fetchInspectionRow = async (id: string): Promise<InspectionRow | null> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError(400, 'INSPECTION_INVALID', 'Identifiant d’état des lieux invalide.');
  }

  const admin = getInspectionAdmin();
  const { data, error } = await admin
    .from('video_inspections')
    .select(
      'id,user_id,item_title,category,inspection_type,notes,video_url,video_path,video_mime_type,video_duration_seconds,client_validated_at,replaced_at,created_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[Inspections] Lecture impossible :', error.message);
    throw new ApiError(500, 'INSPECTION_LOOKUP_FAILED', 'Impossible de charger cet état des lieux.');
  }

  return (data as InspectionRow) || null;
};
