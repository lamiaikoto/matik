import { Router, Request, Response } from 'express';
import bookingHandler from '../../api/booking';

const router = Router();

/**
 * POST /api/booking
 *
 * En développement, on réutilise EXACTEMENT le handler serverless de production
 * (`api/booking.ts`) : authentification Supabase obligatoire, tarification
 * recalculée côté serveur et autorisations par réservation.
 *
 * Cela évite qu'un comportement « dev » plus permissif ne masque une faille
 * avant le déploiement.
 */
router.post('/booking', (req: Request, res: Response): void => {
  void bookingHandler(req as any, res as any);
});

/**
 * GET /api/health
 * Endpoint de vérification de santé du serveur (sans secret exposé).
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Matik Booking API',
    timestamp: new Date().toISOString(),
    config: {
      stripe: !!process.env.STRIPE_SECRET_KEY?.trim(),
      resend: !!process.env.RESEND_API_KEY?.trim(),
      database: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    },
  });
});

export default router;
