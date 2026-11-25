/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Refaite / remplacement d'un état des lieux vidéo AVANT validation
 * ════════════════════════════════════════════════════════════════════════════
 * POST /api/inspections/replace
 * Body :
 *   {
 *     "id": "<uuid>",
 *     "videoUrl": "<URL publique Storage>",
 *     "videoPath": "<chemin Storage>",
 *     "contentType": "video/webm" | "video/mp4" | "video/quicktime",
 *     "durationSeconds": 42.5,
 *     "itemTitle"?, "category"?, "inspectionType"?, "notes"?
 *   }
 *
 * Règles :
 *   - réservé au créateur connecté (jeton Bearer) ;
 *   - refus 409 si `client_validated_at` est renseigné (preuve verrouillée) ;
 *   - l'ancienne vidéo Storage est supprimée lors du remplacement ;
 *   - après validation, seule la suppression reste disponible (route delete).
 */
import { applyCors, ApiError, toErrorPayload } from '../lib/bookingSecurity.js';
import {
  authorizeInspectionAccess,
  fetchInspectionRow,
  getInspectionAdmin,
  removeInspectionVideoObject,
} from '../lib/inspections.js';

const ALLOWED_CATEGORIES = ['logement', 'outillage', 'evenementiel', 'vehicule', 'autre'];
const ALLOWED_TYPES = ['entree', 'sortie'];
const ALLOWED_MIME = ['video/webm', 'video/mp4', 'video/quicktime'];

export default async function handler(req: any, res: any) {
  applyCors(req, res, req.headers?.host);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      throw new ApiError(400, 'INVALID_BODY', 'Corps de requête JSON invalide.');
    }

    const id = String(body.id || body.inspectionId || '').trim();
    if (!id) throw new ApiError(400, 'INSPECTION_ID_REQUIRED', 'Identifiant d’état des lieux manquant.');

    const row = await fetchInspectionRow(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Cet état des lieux est introuvable.' });
    }

    // Verrou post-validation : aucune remplacement possible.
    if (row.client_validated_at) {
      throw new ApiError(
        409,
        'INSPECTION_VALIDATED_LOCKED',
        'Cet état des lieux est validé par le client : la vidéo ne peut plus être remplacée. Seule la suppression est possible.'
      );
    }

    await authorizeInspectionAccess(row, req, { requireOwner: true });

    const videoUrl = String(body.videoUrl || '').trim();
    const videoPath = String(body.videoPath || '').trim();
    const contentType = String(body.contentType || '').trim().toLowerCase();

    if (!videoUrl || !videoPath) {
      throw new ApiError(400, 'VIDEO_REQUIRED', 'La nouvelle vidéo (URL et chemin) est obligatoire.');
    }
    if (!ALLOWED_MIME.includes(contentType)) {
      throw new ApiError(400, 'VIDEO_MIME_INVALID', 'Format vidéo non autorisé (webm, mp4 ou mov).');
    }

    const durationSeconds = Number(body.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 3600) {
      throw new ApiError(400, 'VIDEO_DURATION_INVALID', 'Durée vidéo invalide.');
    }

    const patch: Record<string, unknown> = {
      video_url: videoUrl,
      video_path: videoPath,
      video_mime_type: contentType,
      video_duration_seconds: Math.round(durationSeconds * 10) / 10,
      replaced_at: new Date().toISOString(),
    };

    const itemTitle = typeof body.itemTitle === 'string' ? body.itemTitle.trim() : '';
    if (itemTitle) {
      if (itemTitle.length > 160) throw new ApiError(400, 'TITLE_TOO_LONG', 'Titre trop long (160 caractères max).');
      patch.item_title = itemTitle;
    }
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (category) {
      if (!ALLOWED_CATEGORIES.includes(category)) throw new ApiError(400, 'CATEGORY_INVALID', 'Catégorie invalide.');
      patch.category = category;
    }
    const inspectionType = typeof body.inspectionType === 'string' ? body.inspectionType.trim() : '';
    if (inspectionType) {
      if (!ALLOWED_TYPES.includes(inspectionType)) throw new ApiError(400, 'TYPE_INVALID', 'Moment de l’état des lieux invalide.');
      patch.inspection_type = inspectionType;
    }
    if (typeof body.notes === 'string') {
      const notes = body.notes.trim();
      if (notes.length > 2000) throw new ApiError(400, 'NOTES_TOO_LONG', 'Notes trop longues (2000 caractères max).');
      patch.notes = notes || null;
    }

    const admin = getInspectionAdmin();

    // L'ancienne vidéo est supprimée pour éviter tout stockage orphelin.
    await removeInspectionVideoObject(admin, row);

    const { error } = await admin.from('video_inspections').update(patch).eq('id', id);
    if (error) {
      console.error('[Inspections] Remplacement impossible :', error.message);
      throw new ApiError(500, 'INSPECTION_REPLACE_FAILED', 'Le remplacement de la vidéo a échoué. Réessayez.');
    }

    return res.status(200).json({
      success: true,
      id,
      videoUrl,
      replacedAt: patch.replaced_at,
      message: 'Vidéo remplacée avant validation client.',
    });
  } catch (error: unknown) {
    const { status, body: errorBody } = toErrorPayload(error);
    return res.status(status).json(errorBody);
  }
}
