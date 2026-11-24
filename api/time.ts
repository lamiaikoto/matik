/**
 * MATIK — Heure serveur de référence pour l'horodatage des états des lieux.
 *
 * GET /api/time → { success, iso, unix }
 *
 * Le navigateur ne doit jamais être la seule source de vérité : l'horloge d'un
 * téléphone peut être modifiée. La vidéo est horodatée avec cette heure serveur
 * (décalage calculé une fois au démarrage de l'enregistrement), puis la ligne
 * `video_inspections.server_timestamp` est écrite par PostgreSQL (`now()`).
 */

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      error: 'Méthode non autorisée.',
    });
  }

  const now = new Date();

  return res.status(200).json({
    success: true,
    iso: now.toISOString(),
    unix: now.getTime(),
  });
}
