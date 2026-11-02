import type { IncomingMessage, ServerResponse } from 'http';
import { generateContractPDF, ContractData } from '../server/services/generateContract';
import { sendBookingEmails, EmailData } from '../server/services/sendEmail';
import { createStripeCheckoutSession, StripeHoldData } from '../server/services/stripeService';

/**
 * Vercel Serverless Function Handler
 * Route: POST /api/booking
 */
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Matik Booking Serverless API',
      timestamp: new Date().toISOString(),
      config: {
        stripe: !!process.env.STRIPE_SECRET_KEY,
        resend: !!process.env.RESEND_API_KEY,
        supabase: !!process.env.VITE_SUPABASE_URL,
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // Validation
    const required = ['clientPrenom', 'clientNom', 'clientEmail', 'equipmentName', 'startDate', 'endDate', 'dureeJours', 'totalLocation', 'montantCaution'];
    const missing = required.filter((f) => !body[f] && body[f] !== 0);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Champs obligatoires manquants : ${missing.join(', ')}`,
      });
    }

    const bookingId = `MAT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Génération contrat PDF
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
    } catch (pdfErr: any) {
      return res.status(500).json({
        success: false,
        error: `Erreur génération PDF : ${pdfErr?.message || pdfErr}`,
      });
    }

    // 2. Stripe Checkout Session (Empreinte caution)
    const appUrl = process.env.APP_URL || (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:5173');
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
    }

    // 3. Resend Email
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
    }

    // Réponse
    return res.status(200).json({
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
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur interne du serveur',
    });
  }
}
