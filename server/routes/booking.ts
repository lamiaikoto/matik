import { Router, Request, Response } from 'express';
import { generateContractPDF, ContractData } from '../services/generateContract';
import { sendBookingEmails, EmailData } from '../services/sendEmail';
import { createStripeCheckoutSession, StripeHoldData } from '../services/stripeService';

const router = Router();

/**
 * POST /api/booking
 *
 * Endpoint principal de réservation Matik.
 * Gère directement :
 *   1. Génération du contrat PDF
 *   2. Envoi des e-mails de confirmation (client + loueur) avec contrat en PJ
 *   3. Création de la session Stripe Checkout pour l'empreinte de caution
 */
router.post('/booking', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;

    // ─── Validation des champs obligatoires ─────────────
    const required = ['clientPrenom', 'clientNom', 'clientEmail', 'equipmentName', 'startDate', 'endDate', 'dureeJours', 'totalLocation', 'montantCaution'];
    const missing = required.filter((f) => !body[f] && body[f] !== 0);
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `Champs obligatoires manquants : ${missing.join(', ')}`,
      });
      return;
    }

    const bookingId = `MAT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    console.log(`\n🔔 [Booking API] Nouvelle réservation : ${bookingId}`);
    console.log('📦 Données reçues :', JSON.stringify(body, null, 2));

    // ─── 1. Génération du contrat PDF ───────────────────
    const contractData: ContractData = {
      bookingId,
      clientPrenom: body.clientPrenom,
      clientNom: body.clientNom,
      clientEmail: body.clientEmail,
      clientTelephone: body.clientTelephone || '',
      loueurNom: body.loueurNom || body.artisanNom || '',
      loueurEmail: body.loueurEmail || '',
      loueurTelephone: body.loueurTelephone || '',
      equipmentName: body.equipmentName || body.nomMatiere || '',
      equipmentCategory: body.equipmentCategory || body.categorie || '',
      equipmentId: body.equipmentId || '',
      startDate: body.startDate,
      endDate: body.endDate,
      dureeJours: Number(body.dureeJours),
      prixJournalier: Number(body.prixJournalier) || 0,
      sousTotal: Number(body.sousTotal) || 0,
      fraisService: Number(body.fraisService) || 0,
      totalLocation: Number(body.totalLocation),
      montantCaution: Number(body.montantCaution),
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateContractPDF(contractData);
      console.log(`✅ [PDF] Contrat généré : ${bookingId} (${pdfBuffer.length} octets)`);
    } catch (pdfErr: any) {
      console.error('❌ [PDF] Erreur génération contrat :', pdfErr);
      res.status(500).json({
        success: false,
        error: `Erreur génération PDF : ${pdfErr?.message || pdfErr}`,
      });
      return;
    }

    // ─── 2. Création de la session Stripe (empreinte caution) ──
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    const stripeData: StripeHoldData = {
      bookingId,
      clientEmail: body.clientEmail,
      clientNom: `${body.clientPrenom} ${body.clientNom}`.trim(),
      equipmentName: body.equipmentName || body.nomMatiere || '',
      equipmentId: body.equipmentId || '',
      montantCaution: Number(body.montantCaution),
      totalLocation: Number(body.totalLocation),
      appUrl,
    };

    let stripeResult: { success: boolean; checkoutUrl?: string; sessionId?: string; error?: string } = { success: true };

    if (process.env.STRIPE_SECRET_KEY) {
      stripeResult = await createStripeCheckoutSession(stripeData);
    } else {
      console.warn('⚠️ [Stripe] STRIPE_SECRET_KEY non configurée — session Stripe ignorée.');
    }

    // ─── 3. Envoi des e-mails de confirmation ───────────
    const emailData: EmailData = {
      bookingId,
      clientPrenom: body.clientPrenom,
      clientNom: body.clientNom,
      clientEmail: body.clientEmail,
      loueurNom: body.loueurNom || body.artisanNom || '',
      loueurEmail: body.loueurEmail || '',
      equipmentName: body.equipmentName || body.nomMatiere || '',
      equipmentCategory: body.equipmentCategory || body.categorie || '',
      startDate: body.startDate,
      endDate: body.endDate,
      dureeJours: Number(body.dureeJours),
      sousTotal: Number(body.sousTotal) || 0,
      fraisService: Number(body.fraisService) || 0,
      totalLocation: Number(body.totalLocation),
      montantCaution: Number(body.montantCaution),
      stripeCheckoutUrl: stripeResult.checkoutUrl,
    };

    let emailResult = { clientSent: false, loueurSent: false, errors: [] as string[] };

    if (process.env.RESEND_API_KEY) {
      emailResult = await sendBookingEmails(emailData, pdfBuffer);
    } else {
      console.warn('⚠️ [Email] RESEND_API_KEY non configurée — e-mails ignorés.');
    }

    // ─── Réponse finale ─────────────────────────────────
    const response = {
      success: true,
      bookingId,
      message: 'Réservation traitée avec succès',
      contract: {
        generated: true,
        sizeBytes: pdfBuffer.length,
      },
      email: {
        clientSent: emailResult.clientSent,
        loueurSent: emailResult.loueurSent,
        errors: emailResult.errors,
      },
      stripe: {
        sessionCreated: stripeResult.success,
        checkoutUrl: stripeResult.checkoutUrl || null,
        sessionId: stripeResult.sessionId || null,
        error: stripeResult.error || null,
      },
      // Payload standard de réservation pour le frontend
      payload: {
        client_nom: `${body.clientPrenom} ${body.clientNom}`.trim(),
        client_email: body.clientEmail,
        artisan_nom: body.loueurNom || body.artisanNom || '',
        nom_matiere: body.equipmentName || body.nomMatiere || '',
        duree_jours: Number(body.dureeJours),
        sous_total: Number(body.sousTotal) || 0,
        frais_service: Number(body.fraisService) || 0,
        total_location: Number(body.totalLocation),
        montant_caution: Number(body.montantCaution),
        date_debut: body.startDate,
        date_fin: body.endDate,
        timestamp: new Date().toISOString(),
        loueur_nom: body.loueurNom || body.artisanNom || '',
        loueur_email: body.loueurEmail || '',
        loueur_telephone: body.loueurTelephone || '',
        artisan_email: body.loueurEmail || '',
        artisan_telephone: body.loueurTelephone || '',
      },
    };

    console.log(`\n✅ [Booking API] Réservation ${bookingId} terminée avec succès.`);
    console.log(`   📄 PDF : ${pdfBuffer.length} octets`);
    console.log(`   📧 Client : ${emailResult.clientSent ? '✓' : '✗'} | Loueur : ${emailResult.loueurSent ? '✓' : '✗'}`);
    console.log(`   💳 Stripe : ${stripeResult.success ? '✓' : '✗'} ${stripeResult.checkoutUrl ? `→ ${stripeResult.checkoutUrl}` : ''}\n`);

    res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ [Booking API] Erreur inattendue :', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erreur interne du serveur',
    });
  }
});

/**
 * GET /api/health
 * Endpoint de vérification de santé du serveur.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Matik Booking API',
    timestamp: new Date().toISOString(),
    config: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      resend: !!process.env.RESEND_API_KEY,
      supabase: !!process.env.VITE_SUPABASE_URL,
    },
  });
});

export default router;
