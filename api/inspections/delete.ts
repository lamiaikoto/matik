/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Suppression d'un état des lieux vidéo (ligne + fichier Storage)
 * ════════════════════════════════════════════════════════════════════════════
 * POST /api/inspections/delete
 * Body : { "id": "<uuid>" }
 *
 * Autorisations :
 *   - créateur connecté (Authorization: Bearer …) ;
 *   - ou détenteur du lien privé (aucun jeton) : le locataire/client peut
 *     aussi supprimer la preuve, avec confirmation côté interface.
 *
 * Règles métier :
 *   - avant validation client : suppression possible ;
 *   - après validation client : suppression encore possible, mais aucune
 *     modification ni remplacement (verrou porté par la migration 11).
 */
import { applyCors, ApiError, toErrorPayload } from '../lib/bookingSecurity.js';
import {
  authorizeInspectionAccess,
  fetchInspectionRow,
  getInspectionAdmin,
  removeInspectionVideoObject,
} from '../lib/inspections.js';

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
    if (!id) {
      throw new ApiError(400, 'INSPECTION_ID_REQUIRED', 'Identifiant d’état des lieux manquant.');
    }

    const row = await fetchInspectionRow(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Cet état des lieux est introuvable ou déjà supprimé.' });
    }

    await authorizeInspectionAccess(row, req, { requireOwner: false });

    const admin = getInspectionAdmin();

    // 1. Suppression du fichier vidéo (best-effort : orphelin toléré si Storage
    //    temporairement indisponible, la ligne restera quand même purgée).
    await removeInspectionVideoObject(admin, row);

    // 2. Suppression de la ligne de métadonnées.
    const { error } = await admin.from('video_inspections').delete().eq('id', id);
    if (error) {
      console.error('[Inspections] Suppression ligne impossible :', error.message);
      throw new ApiError(500, 'INSPECTION_DELETE_FAILED', 'La suppression a échoué. Réessayez dans un instant.');
    }

    return res.status(200).json({
      success: true,
      id,
      wasValidated: Boolean(row.client_validated_at),
      message: 'État des lieux supprimé (vidéo et enregistrement).',
    });
  } catch (error: unknown) {
    const { status, body: errorBody } = toErrorPayload(error);
    return res.status(status).json(errorBody);
  }
}
