import PDFDocument from 'pdfkit';
import { Resend } from 'resend';
import Stripe from 'stripe';
import {
  ApiError,
  applyCors,
  assertClientAmountsMatch,
  computeServerPricing,
  fetchBookingForUser,
  fetchEquipmentForBooking,
  getSupabaseAdmin,
  requireUser,
  toErrorPayload,
  type ServerPricing,
} from './lib/bookingSecurity';

// ─── TYPES ──────────────────────────────────────────────────
export interface ContractData {
  bookingId: string;
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone: string;
  loueurNom: string;
  loueurEmail: string;
  loueurTelephone: string;
  equipmentName: string;
  equipmentCategory: string;
  equipmentId: string;
  startDate: string;
  endDate: string;
  dureeJours: number;
  prixJournalier: number;
  sousTotal: number;
  fraisService: number;
  totalLocation: number;
  montantCaution: number;
}

export interface EmailData {
  bookingId: string;
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  loueurNom: string;
  loueurEmail: string;
  equipmentName: string;
  equipmentCategory: string;
  startDate: string;
  endDate: string;
  dureeJours: number;
  sousTotal: number;
  fraisService: number;
  totalLocation: number;
  montantCaution: number;
  stripeCheckoutUrl?: string;
  stripePaymentUrl?: string;
  stripeCautionUrl?: string;
}

export interface StripeHoldData {
  bookingId: string;
  clientEmail: string;
  clientNom: string;
  equipmentName: string;
  equipmentId: string;
  montantCaution: number;
  totalLocation: number;
  /** Frais de service Matik (10 %), base de la commission plateforme. */
  fraisService?: number;
  appUrl: string;
  startDate?: string;
  endDate?: string;
  dureeJours?: number;
  /** ID du compte Stripe Connect du loueur (optionnel) */
  loueurStripeAccountId?: string;
}

export interface StripeHoldResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  customerId?: string;
  cautionAuthorizedAt?: string;
  error?: string;
}

export interface StripePaymentResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  customerId?: string;
  error?: string;
}

export interface StripeSessionsResult {
  /** Session d'encaissement réel de la location */
  payment: StripePaymentResult;
  /** Session d'empreinte de caution (non débitée) */
  caution: StripeHoldResult;
}

// ─── 1. GÉNÉRATION CONTRAT PDF ──────────────────────────────
async function generateContractPDF(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`📑 [PDFKit] Début de génération du contrat PDF pour la réservation ${data.bookingId}...`);
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Contrat de Location - ${data.bookingId}`,
          Author: 'Matik - Location de Matériel',
          Subject: `Location ${data.equipmentName}`,
        },
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`✅ [PDFKit] Contrat généré avec succès (${buffer.length} octets).`);
        resolve(buffer);
      });
      doc.on('error', (err) => {
        console.error('❌ [PDFKit] Erreur du stream PDF :', err);
        reject(err);
      });

      const pageWidth = doc.page.width - 100;

      // En-tête
      doc.rect(50, 50, pageWidth, 60).fill('#F59E0B');
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#0F172A').text('MATIK', 70, 65, { width: pageWidth - 40 });
      doc.fontSize(9).font('Helvetica').fillColor('#44403C').text('Location de Matériel & Équipements entre Particuliers et Professionnels', 70, 93, { width: pageWidth - 40 });

      // Titre du contrat
      doc.moveDown(2.5).fontSize(18).font('Helvetica-Bold').fillColor('#0F172A').text('CONTRAT DE LOCATION DE MATÉRIEL', { align: 'center' });
      doc.moveDown(0.3).fontSize(10).font('Helvetica').fillColor('#64748B').text(`Référence : ${data.bookingId}`, { align: 'center' });
      doc.fontSize(10).text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'center' });

      // Parties
      const partiesY = doc.y + 25;

      // Loueur (colonne gauche)
      doc.rect(50, partiesY, pageWidth / 2 - 10, 100).lineWidth(0.5).stroke('#CBD5E1');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#F59E0B').text('LE LOUEUR', 60, partiesY + 10, { width: pageWidth / 2 - 30 });
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text(data.loueurNom || 'Propriétaire Matik', 60, partiesY + 25, { width: pageWidth / 2 - 30 });
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`E-mail : ${data.loueurEmail || 'Non renseigné'}`, 60, partiesY + 42).text(`Tél : ${data.loueurTelephone || 'Non renseigné'}`, 60, partiesY + 56);

      // Client (colonne droite)
      const rightColX = 50 + pageWidth / 2 + 10;
      doc.rect(rightColX, partiesY, pageWidth / 2 - 10, 100).lineWidth(0.5).stroke('#CBD5E1');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#F59E0B').text('LE LOCATAIRE', rightColX + 10, partiesY + 10, { width: pageWidth / 2 - 30 });
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text(`${data.clientPrenom} ${data.clientNom}`, rightColX + 10, partiesY + 25, { width: pageWidth / 2 - 30 });
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`E-mail : ${data.clientEmail}`, rightColX + 10, partiesY + 42).text(`Tél : ${data.clientTelephone || 'Non renseigné'}`, rightColX + 10, partiesY + 56);

      doc.y = partiesY + 120;

      // Article 1
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('Article 1 — Objet de la location');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text('Le Loueur met à disposition du Locataire le matériel suivant :', { lineGap: 4 });
      doc.moveDown(0.3);

      const tableY = doc.y;
      const col1W = pageWidth * 0.5;
      const col2W = pageWidth * 0.5;
      doc.rect(50, tableY, pageWidth, 22).fill('#F8FAFC');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('Désignation', 60, tableY + 6, { width: col1W }).text('Catégorie', 60 + col1W, tableY + 6, { width: col2W });
      doc.rect(50, tableY + 22, pageWidth, 22).lineWidth(0.3).stroke('#E2E8F0');
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(data.equipmentName, 60, tableY + 28, { width: col1W }).text(data.equipmentCategory || '—', 60 + col1W, tableY + 28, { width: col2W });

      doc.y = tableY + 55;

      // Article 2
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('Article 2 — Durée de la location');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`La location prend effet le ${data.startDate} et se termine le ${data.endDate}, soit une durée de ${data.dureeJours} jour(s).`, { lineGap: 4 });

      // Article 3
      doc.moveDown(0.8);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('Article 3 — Conditions financières');
      doc.moveDown(0.3);

      const finY = doc.y;
      const labelW = pageWidth * 0.65;
      const valW = pageWidth * 0.35;
      const lineH = 22;
      const lines = [
        ['Prix journalier', `${data.prixJournalier.toFixed(2)} €`],
        [`Sous-total (${data.dureeJours} jour(s))`, `${data.sousTotal.toFixed(2)} €`],
        ['Frais de service Matik (10%)', `+ ${data.fraisService.toFixed(2)} €`],
        ['TOTAL LOCATION TTC', `${data.totalLocation.toFixed(2)} €`],
        ['Caution (empreinte bancaire, non débitée)', `${data.montantCaution.toFixed(2)} €`],
      ];

      lines.forEach((line, i) => {
        const y = finY + i * lineH;
        if (i === 3) {
          doc.rect(50, y, pageWidth, lineH).fill('#FEF3C7');
        } else {
          doc.rect(50, y, pageWidth, lineH).lineWidth(0.3).stroke('#E2E8F0');
        }
        doc.fontSize(i === 3 ? 10 : 9).font(i === 3 || i === 4 ? 'Helvetica-Bold' : 'Helvetica').fillColor(i === 3 ? '#0F172A' : '#334155').text(line[0], 60, y + 6, { width: labelW }).text(line[1], 60 + labelW, y + 6, { width: valW - 10, align: 'right' });
      });

      doc.y = finY + lines.length * lineH + 15;

      // Article 4
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('Article 4 — Caution & garantie');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(
        `Une empreinte bancaire de ${data.montantCaution.toFixed(2)} € est requise via Stripe. Aucun montant n'est débité : il s'agit d'une simple autorisation de prélèvement qui sera automatiquement levée dans les 24 h suivant la restitution du matériel en bon état. En cas de dégradation constatée lors de l'état des lieux de sortie, le loueur pourra capturer tout ou partie de la caution pour couvrir les réparations ou le remplacement.`,
        { lineGap: 4 }
      );

      // Article 5
      doc.moveDown(0.8);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('Article 5 — Responsabilités & obligations');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(
        `Le Locataire s'engage à utiliser le matériel en bon père de famille, conformément à sa destination. Il est responsable de tout dommage, perte ou vol survenu pendant la période de location. Le Locataire devra restituer le matériel dans l'état dans lequel il l'a reçu, usure normale exclue.`,
        { lineGap: 4 }
      );

      // Signatures
      doc.moveDown(1.5);
      const sigY = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 50, sigY);
      doc.moveDown(1);
      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Signature du Loueur :', 50, doc.y, { width: pageWidth / 2 - 10 }).text('Signature du Locataire :', rightColX, doc.y - doc.currentLineHeight(), { width: pageWidth / 2 - 10 });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y + 30).lineTo(50 + pageWidth / 2 - 30, doc.y + 30).stroke('#CBD5E1');
      doc.moveTo(rightColX, doc.y + 30).lineTo(rightColX + pageWidth / 2 - 30, doc.y + 30).stroke('#CBD5E1');

      // Pied de page
      const footerY = doc.page.height - 60;
      doc.fontSize(7).font('Helvetica').fillColor('#94A3B8').text(
        'Matik — Plateforme de location de matériel entre particuliers et professionnels. Document généré automatiquement et valant contrat entre les parties.',
        50,
        footerY,
        { width: pageWidth, align: 'center' }
      );

      doc.end();
    } catch (error) {
      console.error('❌ [PDFKit] Exception lors du dessin du PDF :', error);
      reject(error);
    }
  });
}

// ─── 2. ENVOI DES E-MAILS (RESEND) ──────────────────────────
function buildEmailHTML(data: EmailData, role: 'client' | 'loueur'): string {
  const isClient = role === 'client';
  const greeting = isClient ? `Bonjour ${data.clientPrenom},` : `Bonjour ${data.loueurNom},`;
  const intro = isClient
    ? `Votre paiement et votre empreinte de caution pour <strong>${data.equipmentName}</strong> ont bien été validés. Votre réservation est officiellement confirmée !`
    : `Une nouvelle réservation a été confirmée et réglée pour votre matériel <strong>${data.equipmentName}</strong>.`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:28px 32px;">
    <h1 style="margin:0;color:#0F172A;font-size:22px;font-weight:900;letter-spacing:-0.5px;">MATIK</h1>
    <p style="margin:4px 0 0;color:#44403C;font-size:12px;">Location de Matériel & Équipements</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="font-size:15px;color:#0F172A;margin:0 0 16px;">${greeting}</p>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 24px;">${intro}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0;font-size:11px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:1px;">Récapitulatif de la réservation validée</p>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#334155;">
          <tr><td style="color:#64748B;">Réf. :</td><td style="font-weight:700;color:#0F172A;">${data.bookingId}</td></tr>
          <tr><td style="color:#64748B;">Matériel :</td><td style="font-weight:700;color:#0F172A;">${data.equipmentName}</td></tr>
          <tr><td style="color:#64748B;">Catégorie :</td><td>${data.equipmentCategory}</td></tr>
          <tr><td style="color:#64748B;">Période :</td><td>${data.startDate} au ${data.endDate} (${data.dureeJours} jour${data.dureeJours > 1 ? 's' : ''})</td></tr>
          ${isClient ? `<tr><td style="color:#64748B;">Loueur :</td><td style="font-weight:600;">${data.loueurNom}</td></tr>` : `<tr><td style="color:#64748B;">Locataire :</td><td style="font-weight:600;">${data.clientPrenom} ${data.clientNom}</td></tr><tr><td style="color:#64748B;">E-mail client :</td><td>${data.clientEmail}</td></tr>`}
        </table>
      </td></tr>
      <tr><td style="padding:16px 20px;border-top:1px solid #E2E8F0;background:#FFFBEB;">
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;">
          <tr><td style="color:#64748B;">Sous-total :</td><td style="text-align:right;font-weight:600;">${data.sousTotal.toFixed(2)} €</td></tr>
          <tr><td style="color:#64748B;">Frais de service Matik (10%) :</td><td style="text-align:right;font-weight:600;">+ ${data.fraisService.toFixed(2)} €</td></tr>
          <tr><td style="font-weight:800;color:#0F172A;font-size:14px;">Total réglé TTC :</td><td style="text-align:right;font-weight:900;color:#0F172A;font-size:15px;">${data.totalLocation.toFixed(2)} €</td></tr>
          <tr><td style="color:#059669;font-weight:600;">Caution Stripe (sécurisée sans débit) :</td><td style="text-align:right;font-weight:700;color:#059669;">${data.montantCaution.toFixed(2)} €</td></tr>
        </table>
      </td></tr>
    </table>
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#065F46;font-weight:600;">
        ✔ Paiement et empreinte de caution enregistrés avec succès.
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#047857;">
        Votre contrat de location signé est joint au format PDF à cet e-mail.
      </p>
    </div>
    <p style="font-size:12px;color:#64748B;line-height:1.6;margin:16px 0 0;">
      ${isClient ? 'Conservez cet e-mail ainsi que votre contrat joint comme justificatif lors de la mise à disposition.' : 'Le contrat de location complet est joint à cet e-mail. Le locataire a reçu le même exemplaire signé.'}
    </p>
  </td></tr>
  <tr><td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
    <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
      © ${new Date().getFullYear()} Matik — Location de matériel sécurisée. Tous droits réservés.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Envoie un e-mail unique via l'API Resend avec gestion explicite des erreurs et fallback
 */
async function sendSingleEmail(
  resend: Resend,
  options: {
    to: string;
    subject: string;
    html: string;
    attachment: { filename: string; content: Buffer };
    recipientType: 'client' | 'loueur';
    primarySender: string;
    fallbackSender: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, attachment, recipientType, primarySender, fallbackSender } = options;

  console.log(`\n📨 [Resend] Préparation envoi email ${recipientType.toUpperCase()} vers "${to}"`);
  console.log(`   - Objet : "${subject}"`);
  console.log(`   - Expéditeur initial : "${primarySender}"`);
  console.log(`   - Pièce jointe : "${attachment.filename}" (${attachment.content.length} octets)`);

  const attempt = async (sender: string) => {
    console.log(`   🚀 Appel Resend API avec from: "${sender}"...`);
    const payload = {
      from: sender,
      to: [to],
      subject,
      html,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
        },
      ],
    };
    return await resend.emails.send(payload);
  };

  try {
    // 1ère tentative : expéditeur principal
    let res = await attempt(primarySender);

    console.log(`   📡 Réponse Resend brute pour "${primarySender}" :`, JSON.stringify(res));

    // Si Resend retourne une erreur (par exemple domaine non vérifié)
    if (res.error) {
      console.warn(`   ⚠️ [Resend] Erreur avec l'expéditeur "${primarySender}" : [${res.error.name}] ${res.error.message}`);

      // Si l'expéditeur principal est différent du fallback, on réessaie automatiquement avec le fallback
      if (primarySender !== fallbackSender) {
        console.log(`   🔄 [Resend] Tentative de repli (fallback) automatique sur "${fallbackSender}"...`);
        res = await attempt(fallbackSender);
        console.log(`   📡 Réponse Resend brute pour le repli "${fallbackSender}" :`, JSON.stringify(res));
      }
    }

    // Vérification finale du résultat
    if (res.error) {
      const errorDetail = `Resend Error [${res.error.name}]: ${res.error.message}`;
      console.error(`   ❌ [Resend] Échec définitif de l'envoi à "${to}" :`, errorDetail);
      return { success: false, error: errorDetail };
    }

    if (res.data?.id) {
      console.log(`   ✅ [Resend] Succès ! E-mail ${recipientType} délivré à "${to}" (Message ID: ${res.data.id})`);
      return { success: true, messageId: res.data.id };
    }

    const unkErr = 'Réponse inattendue de Resend (ni data.id ni error)';
    console.error(`   ❌ [Resend] ${unkErr}`);
    return { success: false, error: unkErr };
  } catch (exception: any) {
    const excMsg = `Exception inattendue réseau/SDK Resend : ${exception?.message || exception}`;
    console.error(`   💥 [Resend]`, excMsg);
    return { success: false, error: excMsg };
  }
}

async function sendBookingEmails(
  data: EmailData,
  contractPdfBuffer: Buffer
): Promise<{ clientSent: boolean; loueurSent: boolean; clientMessageId?: string; loueurMessageId?: string; errors: string[] }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    const warn = 'RESEND_API_KEY non configurée dans l\'environnement Vercel.';
    console.warn('⚠️ [Resend]', warn);
    return { clientSent: false, loueurSent: false, errors: [warn] };
  }

  const trimmedKey = apiKey.trim();
  console.log(`🔑 [Resend] Clé API détectée (longueur: ${trimmedKey.length}, commence par "${trimmedKey.substring(0, 3)}...")`);

  const resend = new Resend(trimmedKey);

  // Normalisation des expéditeurs
  // Format recommandé pour Resend : "Nom <email@domaine>"
  const rawSender = (process.env.EMAIL_FROM || '').trim();
  const primarySender = rawSender
    ? (rawSender.includes('<') ? rawSender : `Matik <${rawSender}>`)
    : 'Matik <onboarding@resend.dev>';
  const fallbackSender = 'Matik <onboarding@resend.dev>';

  console.log(`📧 [Resend] Configuration expéditeur principal : "${primarySender}" | fallback : "${fallbackSender}"`);

  const errors: string[] = [];
  let clientSent = false;
  let loueurSent = false;
  let clientMessageId: string | undefined;
  let loueurMessageId: string | undefined;

  const attachment = {
    filename: `contrat-location-${data.bookingId}.pdf`,
    content: contractPdfBuffer,
  };

  // 1. Envoi au client
  const clientEmail = (data.clientEmail || '').trim();
  if (clientEmail) {
    const clientRes = await sendSingleEmail(resend, {
      to: clientEmail,
      subject: `[Matik] Votre contrat de location #${data.bookingId} — ${data.equipmentName}`,
      html: buildEmailHTML(data, 'client'),
      attachment,
      recipientType: 'client',
      primarySender,
      fallbackSender,
    });

    clientSent = clientRes.success;
    clientMessageId = clientRes.messageId;
    if (clientRes.error) {
      errors.push(`Client (${clientEmail}): ${clientRes.error}`);
    }
  } else {
    errors.push('Adresse e-mail client vide ou manquante.');
  }

  // 2. Envoi au loueur (si renseigné)
  const loueurEmail = (data.loueurEmail || '').trim();
  if (loueurEmail && loueurEmail !== clientEmail) {
    const loueurRes = await sendSingleEmail(resend, {
      to: loueurEmail,
      subject: `[Matik] Nouvelle réservation #${data.bookingId} — ${data.equipmentName}`,
      html: buildEmailHTML(data, 'loueur'),
      attachment,
      recipientType: 'loueur',
      primarySender,
      fallbackSender,
    });

    loueurSent = loueurRes.success;
    loueurMessageId = loueurRes.messageId;
    if (loueurRes.error) {
      errors.push(`Loueur (${loueurEmail}): ${loueurRes.error}`);
    }
  } else if (!loueurEmail) {
    console.log('ℹ️ [Resend] Aucun e-mail loueur renseigné, envoi loueur ignoré.');
  }

  return { clientSent, loueurSent, clientMessageId, loueurMessageId, errors };
}

// ─── 3a. STRIPE — GESTION DES CLIENTS & PAIEMENTS ──────────
/**
 * Recherche ou crée un Client Stripe pour conserver les moyens de paiement et permettre les renouvellements automatiques de caution.
 */
async function getOrCreateStripeCustomer(
  stripe: Stripe,
  email: string,
  name: string
): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const existing = await stripe.customers.list({ email: cleanEmail, limit: 1 });
    if (existing.data.length > 0) {
      console.log(`👤 [Stripe Customer] Client existant réutilisé : ${existing.data[0].id} (${cleanEmail})`);
      return existing.data[0].id;
    }
  } catch (err: any) {
    console.warn(`⚠️ [Stripe Customer] Erreur recherche : ${err?.message || err}`);
  }

  const customer = await stripe.customers.create({
    email: cleanEmail,
    name: name.trim() || undefined,
    metadata: {
      source: 'matik_booking_platform',
    },
  });
  console.log(`👤 [Stripe Customer] Nouveau client créé : ${customer.id} (${cleanEmail})`);
  return customer.id;
}

/**
 * Crée une session Stripe Checkout pour l'encaissement réel des frais de location.
 *
 * - mode: 'payment' avec capture_method: 'automatic' (débit immédiat)
 * - setup_future_usage: 'off_session' pour attacher la carte au Customer pour les cautions ultérieures
 * - application_fee_amount : 10 % des frais de service Matik (en centimes)
 * - transfer_data.destination : compte Stripe Connect du loueur (si disponible)
 */
async function createStripePaymentSession(data: StripeHoldData, customerId?: string): Promise<StripePaymentResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) {
    console.warn('⚠️ [Stripe] STRIPE_SECRET_KEY non configurée — session paiement ignorée.');
    return { success: true };
  }

  try {
    const stripe = new Stripe(secretKey.trim(), { apiVersion: '2024-11-20.acacia' } as any);
    const totalCents = Math.round(data.totalLocation * 100);

    if (totalCents <= 0) {
      console.log('ℹ️ [Stripe Payment] Montant nul, session paiement ignorée.');
      return { success: true };
    }

    const effectiveCustomerId = customerId || (await getOrCreateStripeCustomer(stripe, data.clientEmail, data.clientNom));

    // Commission Matik : la totalité des frais de service (10 % du sous-total de location).
    // On ne prélève pas un pourcentage du total TTC, sinon une part du loyer du loueur serait retenue.
    const serviceFeeEuros =
      Number(data.fraisService) > 0
        ? Number(data.fraisService)
        : Math.round((data.totalLocation / 1.1) * 0.1 * 100) / 100;
    const applicationFeeCents = Math.min(
      totalCents,
      Math.max(0, Math.round(serviceFeeEuros * 100))
    );

    // Redirection propre après paiement vers la route explicite /booking-success
    const baseUrl = (process.env.APP_URL || data.appUrl || 'https://matikilou.com').replace(/\/+$/, '');
    const successUrl = `${baseUrl}/booking-success?stripe_status=payment_ok&booking_id=${data.bookingId}&session_id={CHECKOUT_SESSION_ID}`;

    // Paramètres de transfer Connect (uniquement si le loueur possède un compte Stripe Connect)
    const hasConnectAccount = !!(data.loueurStripeAccountId && data.loueurStripeAccountId.startsWith('acct_'));

    type PaymentIntentParams = {
      capture_method: 'automatic';
      setup_future_usage: 'off_session';
      description: string;
      metadata: Record<string, string>;
      application_fee_amount?: number;
      transfer_data?: { destination: string };
    };

    const paymentIntentData: PaymentIntentParams = {
      capture_method: 'automatic',
      setup_future_usage: 'off_session',
      description: `Location Matik — ${data.equipmentName} (Réf: ${data.bookingId})`,
      metadata: {
        booking_id: data.bookingId,
        equipment_id: data.equipmentId,
        equipment_name: data.equipmentName,
        client_email: data.clientEmail,
        customer_id: effectiveCustomerId,
        type: 'location_payment',
      },
    };

    if (hasConnectAccount) {
      paymentIntentData.application_fee_amount = applicationFeeCents;
      paymentIntentData.transfer_data = { destination: data.loueurStripeAccountId as string };
      console.log(`💸 [Stripe Payment] Transfer Connect vers ${data.loueurStripeAccountId}, commission = ${(applicationFeeCents / 100).toFixed(2)} €`);
    } else {
      console.log('ℹ️ [Stripe Payment] Pas de compte Connect loueur — paiement encaissé sur compte Matik principal.');
    }

    // expires_at : 45 min dans le futur (> 30 min min Stripe, marge pour clock skew)
    const expiresAt = Math.floor(Date.now() / 1000) + 45 * 60;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: effectiveCustomerId,
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      payment_intent_data: paymentIntentData as any,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Location — ${data.equipmentName}`,
              description: `Frais de location Matik. Réf: ${data.bookingId}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: data.bookingId,
        equipment_id: data.equipmentId,
        type: 'matik_location_payment',
        customer_id: effectiveCustomerId,
        loueur_stripe_account: data.loueurStripeAccountId || 'none',
        application_fee_cents: String(applicationFeeCents),
      },
      success_url: successUrl,
      cancel_url: `${(process.env.APP_URL || data.appUrl || 'https://matikilou.com').replace(/\/+$/, '')}/booking-success?stripe_status=cancel&booking_id=${data.bookingId}`,
      expires_at: expiresAt,
    });

    console.log(`✅ [Stripe Payment] Session paiement créée : ${session.id} (${data.totalLocation} €, customer: ${effectiveCustomerId})`);

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url || undefined,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      customerId: effectiveCustomerId,
    };
  } catch (err: any) {
    console.error('❌ [Stripe Payment] Erreur session paiement :', err?.message || err);
    return { success: false, error: err?.message || 'Erreur Stripe paiement' };
  }
}

// ─── 3b. STRIPE — EMPREINTE DE CAUTION (NON DÉBITÉE & RENOUVELABLE) ───
/**
 * Crée une session Stripe Checkout pour l'empreinte bancaire de caution.
 *
 * - mode: 'payment' avec capture_method: 'manual' (autorisation sans débit)
 * - setup_future_usage: 'off_session' pour conserver le moyen de paiement pour les renouvellements tous les 6 jours
 * - request_extended_authorization: 'if_available' pour étendre la durée de pré-autorisation
 */
async function createStripeCautionSession(data: StripeHoldData, customerId?: string): Promise<StripeHoldResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) {
    console.warn('⚠️ [Stripe] STRIPE_SECRET_KEY non configurée — session caution ignorée.');
    return { success: true };
  }

  try {
    const stripe = new Stripe(secretKey.trim(), { apiVersion: '2024-11-20.acacia' } as any);
    const cautionCents = Math.round(data.montantCaution * 100);

    if (cautionCents <= 0) {
      return { success: true };
    }

    const effectiveCustomerId = customerId || (await getOrCreateStripeCustomer(stripe, data.clientEmail, data.clientNom));
    const expiresAt = Math.floor(Date.now() / 1000) + 45 * 60;
    const cautionAuthorizedAt = new Date().toISOString();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: effectiveCustomerId,
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      payment_intent_data: {
        capture_method: 'manual',
        setup_future_usage: 'off_session',
        payment_method_options: {
          card: {
            request_extended_authorization: 'if_available',
          },
        },
        description: `Caution location Matik — ${data.equipmentName} (Réf: ${data.bookingId})`,
        metadata: {
          booking_id: data.bookingId,
          equipment_id: data.equipmentId,
          equipment_name: data.equipmentName,
          client_email: data.clientEmail,
          customer_id: effectiveCustomerId,
          start_date: data.startDate || '',
          end_date: data.endDate || '',
          duree_jours: String(data.dureeJours || 1),
          montant_caution: String(data.montantCaution),
          caution_authorized_at: cautionAuthorizedAt,
          type: 'caution_empreinte_bancaire',
        },
      } as any,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Caution — ${data.equipmentName}`,
              description: `Empreinte bancaire sécurisée (non débitée). Réf: ${data.bookingId}`,
            },
            unit_amount: cautionCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: data.bookingId,
        equipment_id: data.equipmentId,
        type: 'matik_caution_hold',
        customer_id: effectiveCustomerId,
        caution_authorized_at: cautionAuthorizedAt,
      },
      success_url: `${(process.env.APP_URL || data.appUrl || 'https://matikilou.com').replace(/\/+$/, '')}/booking-success?stripe_status=caution_ok&booking_id=${data.bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${(process.env.APP_URL || data.appUrl || 'https://matikilou.com').replace(/\/+$/, '')}/booking-success?stripe_status=cancel&booking_id=${data.bookingId}`,
      expires_at: expiresAt,
    });

    console.log(`✅ [Stripe Caution] Session empreinte créée : ${session.id} (${data.montantCaution} €, customer: ${effectiveCustomerId})`);

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url || undefined,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      customerId: effectiveCustomerId,
      cautionAuthorizedAt,
    };
  } catch (err: any) {
    console.error('❌ [Stripe Caution] Erreur session caution :', err?.message || err);
    return { success: false, error: err?.message || 'Erreur Stripe caution' };
  }
}

// ─── 3c. ORCHESTRATION — CRÉE LES DEUX SESSIONS STRIPE ──────
async function createStripeCheckoutSessions(data: StripeHoldData): Promise<StripeSessionsResult> {
  console.log('💳 [Stripe] Création des sessions paiement + caution...');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  let customerId: string | undefined;
  if (secretKey && secretKey.trim()) {
    try {
      const stripe = new Stripe(secretKey.trim(), { apiVersion: '2024-11-20.acacia' } as any);
      customerId = await getOrCreateStripeCustomer(stripe, data.clientEmail, data.clientNom);
    } catch (e: any) {
      console.warn('⚠️ [Stripe] Erreur création/récupération customer:', e?.message || e);
    }
  }

  const [payment, caution] = await Promise.all([
    createStripePaymentSession(data, customerId),
    createStripeCautionSession(data, customerId),
  ]);

  if (!payment.success) {
    console.error('❌ [Stripe] Échec session paiement :', payment.error);
  }
  if (!caution.success) {
    console.error('❌ [Stripe] Échec session caution :', caution.error);
  }

  return { payment, caution };
}

// ─── 4. HANDLER VERCEL SERVERLESS FUNCTION ──────────────────
export default async function handler(req: any, res: any) {
  // CORS : seules les origines configurées (APP_URL / ALLOWED_ORIGINS) et la
  // même origine sont autorisées. Plus de `Access-Control-Allow-Origin: *`.
  applyCors(req, res, req.headers?.host);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Healthcheck public : aucune donnée de configuration sensible n'est exposée.
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Matik Booking API',
      timestamp: new Date().toISOString(),
      config: {
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY?.trim(),
        resendConfigured: !!process.env.RESEND_API_KEY?.trim(),
        databaseConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET?.trim(),
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', error: 'Méthode non autorisée. Utilisez POST.' });
  }

  const startTime = Date.now();
  console.log(`\n================================================================`);
  console.log(`🚀 [Vercel API Booking] Requête POST reçue à ${new Date().toISOString()}`);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // ─── AUTHENTIFICATION OBLIGATOIRE ───
    // Aucune action (réservation, caution, e-mail) n'est possible sans JWT valide.
    const user = await requireUser(req);

    // ─── ACTION SPÉCIALE : LIBÉRATION D'EMPREINTE DE CAUTION STRIPE ───
    if (body.action === 'release_caution') {
      const booking = await fetchBookingForUser(body.bookingId || body.booking_id, user.id);
      const bookingRef = booking.id;

      const requestedIntentId = String(body.paymentIntentId || body.payment_intent_id || '').trim();
      // Un PaymentIntent fourni doit appartenir à CETTE réservation.
      const paymentIntentId =
        requestedIntentId && requestedIntentId.startsWith('pi_') && booking.stripe_caution_intent_id
          ? requestedIntentId === booking.stripe_caution_intent_id
            ? requestedIntentId
            : ''
          : '';

      if (requestedIntentId && !paymentIntentId && booking.stripe_caution_intent_id) {
        throw new ApiError(403, 'CAUTION_MISMATCH', "Cette empreinte de caution n'appartient pas à cette réservation.");
      }

      console.log(`🔓 [Vercel API Booking] Libération de caution demandée par ${user.id} pour ${bookingRef} (PaymentIntent: ${paymentIntentId || 'recherche par référence'})`);

      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey || !secretKey.trim()) {
        console.warn('⚠️ [Stripe] STRIPE_SECRET_KEY non configurée — simulation de libération.');
        return res.status(200).json({
          success: true,
          simulated: true,
          message: 'Caution marquée comme libérée (mode simulation sans clé Stripe).',
        });
      }

      try {
        const stripe = new Stripe(secretKey.trim());
        let canceledPaymentIntentId: string | null = null;

        // 1. Si on a directement le paymentIntentId
        if (paymentIntentId && paymentIntentId.startsWith('pi_')) {
          const pi = await stripe.paymentIntents.cancel(paymentIntentId);
          canceledPaymentIntentId = pi.id;
          console.log(`✅ [Stripe] PaymentIntent ${pi.id} annulé avec succès.`);
        } else if (body.sessionId && String(body.sessionId) === booking.stripe_caution_session_id) {
          // 2. Si on a le sessionId Checkout (rattaché à cette réservation)
          const session = await stripe.checkout.sessions.retrieve(String(body.sessionId));
          if (session.payment_intent && typeof session.payment_intent === 'string') {
            const pi = await stripe.paymentIntents.cancel(session.payment_intent);
            canceledPaymentIntentId = pi.id;
            console.log(`✅ [Stripe] PaymentIntent ${pi.id} récupéré via session et annulé avec succès.`);
          }
        } else if (bookingRef) {
          // 3. Recherche du PaymentIntent par métadonnées booking_id
          const search = await stripe.paymentIntents.search({
            query: `metadata['booking_id']:'${bookingRef}' AND metadata['type']:'caution_empreinte_bancaire'`,
          });
          if (search.data.length > 0) {
            const piToCancel = search.data[0];
            if (piToCancel.status === 'requires_capture' || piToCancel.status === 'requires_payment_method') {
              const pi = await stripe.paymentIntents.cancel(piToCancel.id);
              canceledPaymentIntentId = pi.id;
              console.log(`✅ [Stripe] PaymentIntent ${pi.id} trouvé via recherche et annulé.`);
            }
          }
        }

        // Persistance serveur : la caution est marquée libérée même si le client
        // ferme son navigateur juste après l'appel.
        try {
          await getSupabaseAdmin()
            .from('bookings')
            .update({ stripe_caution_status: 'caution_liberee' })
            .eq('id', bookingRef);
        } catch (dbErr: any) {
          console.warn('⚠️ [Supabase] Statut de caution non persisté :', dbErr?.message || dbErr);
        }

        return res.status(200).json({
          success: true,
          message: 'Caution Stripe libérée avec succès (autorisation annulée sans débit).',
          paymentIntentId: canceledPaymentIntentId,
        });
      } catch (stripeErr: any) {
        console.error('❌ [Stripe] Erreur lors de l\'annulation du PaymentIntent :', stripeErr?.message || stripeErr);
        // Si l'erreur indique qu'il a déjà été annulé ou expiré, on considère l'action réussie
        if (stripeErr?.code === 'payment_intent_unexpected_state' || stripeErr?.message?.includes('canceled')) {
          return res.status(200).json({
            success: true,
            message: 'Caution déjà libérée ou expirée sur Stripe.',
            alreadyCanceled: true,
          });
        }
        return res.status(500).json({
          success: false,
          error: stripeErr?.message || 'Erreur lors de la libération Stripe.',
        });
      }
    }

    // ─── ACTION SPÉCIALE : ENVOI DE CONFIRMATION PAR E-MAIL APRÈS VALIDATION ───
    // Toutes les données (destinataires, montants, contrat) viennent de la base :
    // le corps de la requête ne sert plus qu'à identifier la réservation.
    if (body.action === 'send_confirmation_email') {
      const booking = await fetchBookingForUser(body.bookingId || body.booking_id, user.id);

      if (booking.confirmation_email_sent_at) {
        return res.status(200).json({
          success: true,
          alreadySent: true,
          message: 'Le récapitulatif a déjà été envoyé pour cette réservation.',
        });
      }

      console.log(`📬 [Vercel API Booking] Envoi du récapitulatif pour ${booking.id} (demandé par ${user.id})`);

      const clientName = (booking.client_name || '').trim();
      const emailPayload: EmailData = {
        bookingId: booking.id,
        clientPrenom: clientName.split(' ')[0] || 'Locataire',
        clientNom: clientName.split(' ').slice(1).join(' '),
        clientEmail: booking.client_email,
        loueurNom: booking.owner_name || '',
        loueurEmail: booking.owner_email || '',
        equipmentName: booking.equipment_name,
        equipmentCategory: booking.equipment_category,
        startDate: booking.start_date,
        endDate: booking.end_date,
        dureeJours: Number(booking.days) || 1,
        sousTotal: Number(booking.subtotal) || 0,
        fraisService: Number(booking.service_fee) || 0,
        totalLocation: Number(booking.total_price) || 0,
        montantCaution: Number(booking.caution_amount) || 0,
      };

      const contractData: ContractData = {
        bookingId: emailPayload.bookingId,
        clientPrenom: emailPayload.clientPrenom,
        clientNom: emailPayload.clientNom,
        clientEmail: emailPayload.clientEmail,
        clientTelephone: booking.client_phone || '',
        loueurNom: emailPayload.loueurNom,
        loueurEmail: emailPayload.loueurEmail,
        loueurTelephone: booking.owner_phone || '',
        equipmentName: emailPayload.equipmentName,
        equipmentCategory: emailPayload.equipmentCategory,
        equipmentId: booking.equipment_id || '',
        startDate: emailPayload.startDate,
        endDate: emailPayload.endDate,
        dureeJours: emailPayload.dureeJours,
        prixJournalier: emailPayload.dureeJours > 0 ? Math.round((emailPayload.sousTotal / emailPayload.dureeJours) * 100) / 100 : 0,
        sousTotal: emailPayload.sousTotal,
        fraisService: emailPayload.fraisService,
        totalLocation: emailPayload.totalLocation,
        montantCaution: emailPayload.montantCaution,
      };

      const pdfBuffer = await generateContractPDF(contractData);
      const emailResult = await sendBookingEmails(emailPayload, pdfBuffer);

      try {
        await getSupabaseAdmin()
          .from('bookings')
          .update({ confirmation_email_sent_at: new Date().toISOString() })
          .eq('id', booking.id);
      } catch (dbErr: any) {
        console.warn('⚠️ [Supabase] Horodatage e-mail non persisté :', dbErr?.message || dbErr);
      }

      return res.status(200).json({
        success: true,
        message: 'E-mails de confirmation envoyés avec succès.',
        email: emailResult,
      });
    }

    // ─── ACTION SPÉCIALE : RÉCUPÉRATION DES DÉTAILS DE LA SESSION CAUTION ───
    if (body.action === 'get_caution_session_details') {
      const sessionId = String(body.sessionId || body.session_id || '').trim();
      console.log(`🔍 [Vercel API Booking] Récupération détails session Stripe : ${sessionId}`);

      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey || !secretKey.trim() || !sessionId) {
        throw new ApiError(400, 'SESSION_REQUIRED', 'Clé Stripe ou sessionId absent.');
      }

      try {
        const stripe = new Stripe(secretKey.trim(), { apiVersion: '2024-11-20.acacia' } as any);
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent', 'payment_intent.payment_method'],
        });

        // La session doit appartenir à une réservation de l'appelant.
        const bookingRef = String(session.metadata?.booking_id || '').trim();
        const booking = await fetchBookingForUser(bookingRef, user.id);

        if (booking.stripe_caution_session_id && booking.stripe_caution_session_id !== session.id) {
          throw new ApiError(403, 'SESSION_MISMATCH', "Cette session Stripe n'est pas rattachée à votre réservation.");
        }

        const pi = typeof session.payment_intent === 'object' ? (session.payment_intent as any) : null;
        const piId = pi ? pi.id : (typeof session.payment_intent === 'string' ? session.payment_intent : null);
        const customerId = (typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id) || (typeof pi?.customer === 'string' ? pi.customer : pi?.customer?.id) || null;
        const pm = pi?.payment_method;
        const paymentMethodId = typeof pm === 'string' ? pm : (pm?.id || null);
        const authorizedAt = pi?.created ? new Date(pi.created * 1000).toISOString() : new Date().toISOString();

        return res.status(200).json({
          success: true,
          sessionId: session.id,
          paymentIntentId: piId,
          customerId,
          paymentMethodId,
          cautionAuthorizedAt: authorizedAt,
        });
      } catch (err: any) {
        if (err instanceof ApiError) throw err;
        console.warn('⚠️ [Vercel API Booking] Erreur récupération session caution :', err?.message || err);
        return res.status(200).json({ success: false, error: err?.message });
      }
    }

    console.log('📦 Corps reçu (clés) :', Object.keys(body).join(', '));
    console.log(`👤 Locataire authentifié : ${user.id}`);

    // ─── 1. VALIDATION MINIMALE DES DONNÉES NON TARIFAIRES ───
    const startDate = typeof body.startDate === 'string' ? body.startDate.slice(0, 10) : '';
    const endDate = typeof body.endDate === 'string' ? body.endDate.slice(0, 10) : '';
    if (!startDate || !endDate) {
      throw new ApiError(400, 'INVALID_DATES', 'Les dates de location sont obligatoires.');
    }

    const clientPrenom = String(body.clientPrenom || '').trim();
    const clientNom = String(body.clientNom || '').trim();
    if (!clientPrenom || !clientNom) {
      throw new ApiError(400, 'MISSING_NAME', 'Le prénom et le nom du locataire sont obligatoires.');
    }
    if (!user.email) {
      throw new ApiError(400, 'EMAIL_REQUIRED', "Votre compte doit disposer d'une adresse e-mail valide.");
    }

    // ─── 2. TARIFICATION AUTORITAIRE (base de données) ───
    // Les montants envoyés par le navigateur ne sont jamais utilisés pour le débit.
    const equipment = await fetchEquipmentForBooking(body.equipmentId);
    const pricing: ServerPricing = computeServerPricing(equipment, startDate, endDate);
    assertClientAmountsMatch(body as Record<string, unknown>, pricing);

    console.log(
      `💰 [Tarification serveur] ${equipment.title} : ${pricing.dailyRate} €/j × ${pricing.days} j = ${pricing.subtotal} € ` +
        `+ ${pricing.serviceFee} € (frais) = ${pricing.total} € — caution ${pricing.caution} €`
    );

    const bookingId = `MAT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    console.log(`🏷️ Référence générée : ${bookingId}`);

    // ─── 3. PERSISTANCE DE LA RÉSERVATION AVANT TOUTE CRÉATION STRIPE ───
    // Aucun paiement ne doit exister sans ligne en base.
    const admin = getSupabaseAdmin();
    const clientFullName = `${clientPrenom} ${clientNom}`.trim();

    // ─── Identité de contact du loueur résolue CÔTÉ SERVEUR ───
    // Les coordonnées envoyées par le navigateur ne sont jamais reprises telles
    // quelles : un client pourrait sinon substituer un faux numéro/e-mail de
    // loueur dans la réservation, puis dans le contrat PDF envoyé aux deux parties.
    let ownerEmail = '';
    let ownerPhone = '';
    if (equipment.owner_id) {
      try {
        const { data: ownerUser } = await admin.auth.admin.getUserById(equipment.owner_id);
        const ownerMeta: Record<string, any> = ownerUser?.user?.user_metadata || {};
        ownerEmail = String(ownerUser?.user?.email || ownerMeta.email || '').trim();
        ownerPhone = String(ownerMeta.phone || ownerUser?.user?.phone || '').trim();
      } catch (err: any) {
        console.warn('[Booking] Identité du loueur non résolue :', err?.message || err);
      }
    }

    const { error: insertError } = await admin.from('bookings').insert({
      id: bookingId,
      booking_reference: bookingId,
      equipment_id: equipment.id,
      equipment_name: equipment.title || '',
      equipment_category: equipment.category || '',
      equipment_image: equipment.image_url || '',
      locataire_id: user.id,
      loueur_id: equipment.owner_id,
      client_name: clientFullName,
      client_email: user.email,
      client_phone: String(body.clientTelephone || '').trim(),
      owner_name: String(body.loueurNom || body.artisanNom || '').trim() || null,
      owner_email: ownerEmail || null,
      owner_phone: ownerPhone || null,
      start_date: pricing.startDate,
      end_date: pricing.endDate,
      days: pricing.days,
      subtotal: pricing.subtotal,
      service_fee: pricing.serviceFee,
      total_price: pricing.total,
      caution_amount: pricing.caution,
      status: 'pending_payment',
      stripe_caution_status: 'sequestre_sans_debit',
    });

    if (insertError && insertError.code !== '23505') {
      console.error('❌ [Supabase] Réservation non persistée :', insertError.message);
      throw new ApiError(
        500,
        'BOOKING_PERSIST_FAILED',
        "La réservation n'a pas pu être enregistrée. Aucun paiement n'a été effectué."
      );
    }
    const insertedFresh = !insertError;

    // 4. Génération du contrat PDF (données base + montants serveur)
    const contractData: ContractData = {
      bookingId,
      clientPrenom,
      clientNom,
      clientEmail: user.email,
      clientTelephone: String(body.clientTelephone || '').trim(),
      loueurNom: String(body.loueurNom || body.artisanNom || '').trim(),
      loueurEmail: ownerEmail,
      loueurTelephone: ownerPhone,
      equipmentName: equipment.title || '',
      equipmentCategory: equipment.category || '',
      equipmentId: equipment.id,
      startDate: pricing.startDate,
      endDate: pricing.endDate,
      dureeJours: pricing.days,
      prixJournalier: pricing.dailyRate,
      sousTotal: pricing.subtotal,
      fraisService: pricing.serviceFee,
      totalLocation: pricing.total,
      montantCaution: pricing.caution,
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateContractPDF(contractData);
    } catch (pdfErr: any) {
      console.error('❌ [Vercel API] Erreur critique génération PDF :', pdfErr);
      if (insertedFresh) {
        await admin.from('bookings').delete().eq('id', bookingId).eq('status', 'pending_payment');
      }
      throw new ApiError(500, 'CONTRACT_GENERATION_FAILED', `Erreur génération du contrat : ${pdfErr?.message || pdfErr}`);
    }

    // 5. Initialisation Stripe (paiement location + empreinte caution)
    const host = req.headers?.host || 'matikilou.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const originHeader = req.headers?.origin || req.headers?.referer;
    let fallbackAppUrl = `${protocol}://${host}`;
    if (originHeader) {
      try {
        const u = new URL(originHeader);
        fallbackAppUrl = `${u.protocol}//${u.host}`;
      } catch {}
    }
    const appUrl = process.env.APP_URL || fallbackAppUrl;

    // Récupération serveur sécurisée du compte Stripe Connect du loueur depuis ses métadonnées Supabase
    let loueurStripeAccountId: string | undefined;
    if (equipment.owner_id) {
      try {
        const { data: ownerUser } = await admin.auth.admin.getUserById(equipment.owner_id);
        const connectId = ownerUser?.user?.user_metadata?.stripe_connect_account_id;
        if (connectId && typeof connectId === 'string' && connectId.startsWith('acct_')) {
          loueurStripeAccountId = connectId.trim();
          console.log(`🏦 [Stripe Connect] Compte loueur trouvé en base pour ${equipment.owner_id} : ${loueurStripeAccountId}`);
        }
      } catch (err: any) {
        console.warn('⚠️ [Stripe Connect] Impossible de lire le compte Connect du loueur :', err?.message || err);
      }
    }
    // Le compte Connect du loueur provient EXCLUSIVEMENT de ses métadonnées Supabase.
    // Ne jamais accepter `body.loueurStripeAccountId` : le navigateur pourrait
    // y glisser le compte d'un tiers et détourner le virement de la location.

    const stripeData: StripeHoldData = {
      bookingId,
      clientEmail: contractData.clientEmail,
      clientNom: clientFullName,
      equipmentName: contractData.equipmentName,
      equipmentId: equipment.id,
      montantCaution: pricing.caution,
      totalLocation: pricing.total,
      fraisService: pricing.serviceFee,
      appUrl,
      startDate: pricing.startDate,
      endDate: pricing.endDate,
      dureeJours: pricing.days,
      loueurStripeAccountId: loueurStripeAccountId?.startsWith('acct_') ? loueurStripeAccountId : undefined,
    };

    console.log('💳 [Stripe] Initialisation des sessions Stripe (Paiement réel + Caution)...');
    const stripeSessions = await createStripeCheckoutSessions(stripeData);

    // 6. Enregistrement des identifiants Stripe côté base (le webhook fera foi)
    const stripePatch: Record<string, unknown> = {};
    if (stripeSessions.payment.paymentIntentId) stripePatch.stripe_payment_intent_id = stripeSessions.payment.paymentIntentId;
    if (stripeSessions.caution.sessionId) stripePatch.stripe_caution_session_id = stripeSessions.caution.sessionId;
    if (stripeSessions.caution.paymentIntentId) stripePatch.stripe_caution_intent_id = stripeSessions.caution.paymentIntentId;
    if (stripeSessions.caution.checkoutUrl) stripePatch.stripe_caution_url = stripeSessions.caution.checkoutUrl;
    const stripeCustomerId = stripeSessions.caution.customerId || stripeSessions.payment.customerId;
    if (stripeCustomerId) stripePatch.stripe_customer_id = stripeCustomerId;
    if (stripeSessions.caution.cautionAuthorizedAt) stripePatch.caution_authorized_at = stripeSessions.caution.cautionAuthorizedAt;

    if (Object.keys(stripePatch).length > 0) {
      const { error: stripePatchError } = await admin.from('bookings').update(stripePatch).eq('id', bookingId);
      if (stripePatchError) {
        console.error('❌ [Supabase] Identifiants Stripe non enregistrés :', stripePatchError.message);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`🏁 [Vercel API] Sessions Stripe créées en ${totalDuration}ms (l'envoi d'e-mail interviendra après confirmation paiement & caution).`);
    console.log(`================================================================\n`);

    // 4. Réponse
    // ⚠️ Vercel limite la taille de réponse à 4.5 MB.
    // On n'inclut le PDF en base64 que si le buffer est raisonnable (< 3 MB encodé).
    const pdfBase64 = pdfBuffer.length < 2_200_000 ? pdfBuffer.toString('base64') : undefined;
    if (!pdfBase64) {
      console.warn(`⚠️ [Vercel API] PDF trop grand (${pdfBuffer.length} octets) — base64 omis de la réponse JSON pour respecter la limite Vercel.`);
    }

    return res.status(200).json({
      success: true,
      bookingId,
      status: 'pending_payment',
      message: 'Réservation validée en attente de règlement et sessions de paiement initialisées.',
      pricing: {
        days: pricing.days,
        dailyRate: pricing.dailyRate,
        subtotal: pricing.subtotal,
        serviceFee: pricing.serviceFee,
        total: pricing.total,
        caution: pricing.caution,
        startDate: pricing.startDate,
        endDate: pricing.endDate,
      },
      contract: {
        generated: true,
        sizeBytes: pdfBuffer.length,
        filename: `contrat-location-${bookingId}.pdf`,
        pdfBase64: pdfBase64 || null,
      },
      email: {
        pendingConfirmation: true,
        clientSent: false,
        loueurSent: false,
      },
      stripe: {
        sessionCreated: stripeSessions.payment.success || stripeSessions.caution.success,
        checkoutUrl: stripeSessions.payment.checkoutUrl || stripeSessions.caution.checkoutUrl || null,
        paymentCheckoutUrl: stripeSessions.payment.checkoutUrl || null,
        cautionCheckoutUrl: stripeSessions.caution.checkoutUrl || null,
        paymentSessionId: stripeSessions.payment.sessionId || null,
        cautionSessionId: stripeSessions.caution.sessionId || null,
        cautionPaymentIntentId: stripeSessions.caution.paymentIntentId || null,
        sessionId: stripeSessions.payment.sessionId || stripeSessions.caution.sessionId || null,
        stripeCustomerId: stripeSessions.caution.customerId || stripeSessions.payment.customerId || null,
        cautionAuthorizedAt: stripeSessions.caution.cautionAuthorizedAt || new Date().toISOString(),
        error: stripeSessions.payment.error || stripeSessions.caution.error || null,
      },
      payload: {
        client_nom: `${contractData.clientPrenom} ${contractData.clientNom}`.trim(),
        client_email: contractData.clientEmail,
        artisan_nom: contractData.loueurNom,
        nom_matiere: contractData.equipmentName,
        duree_jours: contractData.dureeJours,
        sous_total: contractData.sousTotal,
        frais_service: contractData.fraisService,
        total_location: contractData.totalLocation,
        montant_caution: contractData.montantCaution,
        date_debut: contractData.startDate,
        date_fin: contractData.endDate,
        timestamp: new Date().toISOString(),
        loueur_nom: contractData.loueurNom,
        loueur_email: contractData.loueurEmail,
        loueur_telephone: contractData.loueurTelephone,
        artisan_email: contractData.loueurEmail,
        artisan_telephone: contractData.loueurTelephone,
      },
    });
  } catch (error: any) {
    const { status, body: errorBody } = toErrorPayload(error);

    if (status >= 500) {
      console.error('❌ [Vercel API] Erreur critique non gérée :', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        type: error?.type,
        statusCode: error?.statusCode,
        raw: error?.raw,
        stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
      });
    } else {
      console.warn(`⚠️ [Vercel API] Requête refusée (${status}) :`, (errorBody as { error?: string }).error);
    }

    return res.status(status).json({
      ...errorBody,
      // En mode dev, expose plus de détails
      ...(process.env.NODE_ENV !== 'production' && status >= 500
        ? {
            debug: {
              name: error?.name,
              code: error?.code,
              type: error?.type,
            },
          }
        : {}),
    });
  }
}
