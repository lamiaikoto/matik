import PDFDocument from 'pdfkit';
import { Resend } from 'resend';
import Stripe from 'stripe';

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
}

export interface StripeHoldData {
  bookingId: string;
  clientEmail: string;
  clientNom: string;
  equipmentName: string;
  equipmentId: string;
  montantCaution: number;
  totalLocation: number;
  appUrl: string;
}

export interface StripeHoldResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  error?: string;
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
        ['Frais de service & garantie Matik (10%)', `+ ${data.fraisService.toFixed(2)} €`],
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
    ? `Votre réservation pour <strong>${data.equipmentName}</strong> a bien été enregistrée.`
    : `Une nouvelle réservation a été effectuée pour votre matériel <strong>${data.equipmentName}</strong>.`;

  const stripeBlock = isClient && data.stripeCheckoutUrl
    ? `<tr><td style="padding:24px 0;">
         <a href="${data.stripeCheckoutUrl}" style="display:inline-block;padding:14px 28px;background:#F59E0B;color:#0F172A;font-weight:800;text-decoration:none;border-radius:10px;font-size:14px;letter-spacing:0.5px;">
           ✦ Valider mon empreinte de caution Stripe (${data.montantCaution} €)
         </a>
         <p style="margin-top:8px;font-size:11px;color:#64748B;">Empreinte bancaire sécurisée — aucun montant débité.</p>
       </td></tr>`
    : '';

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
        <p style="margin:0;font-size:11px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:1px;">Récapitulatif de la réservation</p>
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
          <tr><td style="font-weight:800;color:#0F172A;font-size:14px;">Total TTC :</td><td style="text-align:right;font-weight:900;color:#0F172A;font-size:15px;">${data.totalLocation.toFixed(2)} €</td></tr>
          <tr><td style="color:#059669;font-weight:600;">Caution Stripe (non débitée) :</td><td style="text-align:right;font-weight:700;color:#059669;">${data.montantCaution.toFixed(2)} €</td></tr>
        </table>
      </td></tr>
    </table>
    ${stripeBlock}
    <p style="font-size:12px;color:#64748B;line-height:1.6;margin:24px 0 0;">
      ${isClient ? 'Vous trouverez votre contrat de location en pièce jointe. Conservez cet e-mail comme justificatif.' : 'Le contrat de location est joint à cet e-mail. Le locataire a reçu le même document.'}
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

// ─── 3. GESTION STRIPE (CAUTION SANS DÉBIT) ───────────────────
async function createStripeCheckoutSession(data: StripeHoldData): Promise<StripeHoldResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) {
    console.warn('⚠️ [Stripe] STRIPE_SECRET_KEY non configurée — session Stripe ignorée.');
    return { success: true };
  }

  try {
    const stripe = new Stripe(secretKey.trim());
    const cautionCents = Math.round(data.montantCaution * 100);

    if (cautionCents <= 0) {
      return { success: true };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: data.clientEmail,
      payment_intent_data: {
        capture_method: 'manual',
        description: `Caution location Matik — ${data.equipmentName} (Réf: ${data.bookingId})`,
        metadata: {
          booking_id: data.bookingId,
          equipment_id: data.equipmentId,
          equipment_name: data.equipmentName,
          client_email: data.clientEmail,
          type: 'caution_empreinte_bancaire',
        },
      },
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
      },
      success_url: `${data.appUrl}?stripe_status=success&booking_id=${data.bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.appUrl}?stripe_status=cancel&booking_id=${data.bookingId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    console.log(`✅ [Stripe] Checkout Session créée : ${session.id} (${data.montantCaution} €)`);

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url || undefined,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    };
  } catch (err: any) {
    console.error('❌ [Stripe] Erreur Checkout Session :', err?.message || err);
    return { success: false, error: err?.message || 'Erreur Stripe' };
  }
}

// ─── 4. HANDLER VERCEL SERVERLESS FUNCTION ──────────────────
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Healthcheck & Configuration Diagnostic
  if (req.method === 'GET') {
    const resendKey = process.env.RESEND_API_KEY;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    return res.status(200).json({
      status: 'ok',
      service: 'Matik Booking Serverless API (Vercel Native)',
      timestamp: new Date().toISOString(),
      config: {
        resendConfigured: !!(resendKey && resendKey.trim()),
        resendKeyPrefix: resendKey ? `${resendKey.trim().substring(0, 5)}...` : null,
        stripeConfigured: !!(stripeKey && stripeKey.trim()),
        emailFrom: process.env.EMAIL_FROM || 'Matik <onboarding@resend.dev>',
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  const startTime = Date.now();
  console.log(`\n================================================================`);
  console.log(`🚀 [Vercel API Booking] Requête POST reçue à ${new Date().toISOString()}`);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    console.log('📦 Corps reçu (clés) :', Object.keys(body).join(', '));
    console.log(`👤 Client : "${body.clientPrenom} ${body.clientNom}" <${body.clientEmail}>`);
    console.log(`🏢 Loueur : "${body.loueurNom || body.artisanNom}" <${body.loueurEmail}>`);
    console.log(`🛠️ Équipement : "${body.equipmentName || body.nomMatiere}" (${body.equipmentCategory || body.categorie})`);
    console.log(`💰 Montants : Total=${body.totalLocation} €, Caution=${body.montantCaution} €`);

    // Validation des champs requis
    const required = [
      'clientPrenom',
      'clientNom',
      'clientEmail',
      'startDate',
      'endDate',
      'dureeJours',
      'totalLocation',
      'montantCaution',
    ];
    const missing = required.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
    if (missing.length > 0) {
      console.warn('⚠️ [Vercel API] Champs obligatoires manquants :', missing);
      return res.status(400).json({
        success: false,
        error: `Champs obligatoires manquants : ${missing.join(', ')}`,
      });
    }

    const bookingId = `MAT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    console.log(`🏷️ Référence générée : ${bookingId}`);

    // 1. Génération du contrat PDF
    const contractData: ContractData = {
      bookingId,
      clientPrenom: String(body.clientPrenom).trim(),
      clientNom: String(body.clientNom).trim(),
      clientEmail: String(body.clientEmail).trim(),
      clientTelephone: String(body.clientTelephone || '').trim(),
      loueurNom: String(body.loueurNom || body.artisanNom || '').trim(),
      loueurEmail: String(body.loueurEmail || '').trim(),
      loueurTelephone: String(body.loueurTelephone || '').trim(),
      equipmentName: String(body.equipmentName || body.nomMatiere || '').trim(),
      equipmentCategory: String(body.equipmentCategory || body.categorie || '').trim(),
      equipmentId: String(body.equipmentId || '').trim(),
      startDate: String(body.startDate),
      endDate: String(body.endDate),
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
      console.error('❌ [Vercel API] Erreur critique génération PDF :', pdfErr);
      return res.status(500).json({
        success: false,
        error: `Erreur génération PDF : ${pdfErr?.message || pdfErr}`,
      });
    }

    // 2. Initialisation Stripe Hold
    const host = req.headers?.host || 'matik.fr';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    const stripeData: StripeHoldData = {
      bookingId,
      clientEmail: contractData.clientEmail,
      clientNom: `${contractData.clientPrenom} ${contractData.clientNom}`.trim(),
      equipmentName: contractData.equipmentName,
      equipmentId: contractData.equipmentId,
      montantCaution: contractData.montantCaution,
      totalLocation: contractData.totalLocation,
      appUrl,
    };

    console.log('💳 [Stripe] Initialisation session caution Stripe...');
    const stripeResult = await createStripeCheckoutSession(stripeData);

    // 3. Envoi des e-mails avec le contrat en pièce jointe
    const emailData: EmailData = {
      bookingId,
      clientPrenom: contractData.clientPrenom,
      clientNom: contractData.clientNom,
      clientEmail: contractData.clientEmail,
      loueurNom: contractData.loueurNom,
      loueurEmail: contractData.loueurEmail,
      equipmentName: contractData.equipmentName,
      equipmentCategory: contractData.equipmentCategory,
      startDate: contractData.startDate,
      endDate: contractData.endDate,
      dureeJours: contractData.dureeJours,
      sousTotal: contractData.sousTotal,
      fraisService: contractData.fraisService,
      totalLocation: contractData.totalLocation,
      montantCaution: contractData.montantCaution,
      stripeCheckoutUrl: stripeResult.checkoutUrl,
    };

    console.log('📬 [Resend] Début de la procédure d\'envoi d\'e-mails...');
    const emailResult = await sendBookingEmails(emailData, pdfBuffer);

    const totalDuration = Date.now() - startTime;
    console.log(`🏁 [Vercel API] Traitement terminé en ${totalDuration}ms`);
    console.log(`   - Email Client : ${emailResult.clientSent ? '✅ Envoyé' : '❌ Échec'}`);
    console.log(`   - Email Loueur : ${emailResult.loueurSent ? '✅ Envoyé' : 'ℹ️ Non envoyé ou ignoré'}`);
    if (emailResult.errors.length > 0) {
      console.warn(`   - Erreurs Email :`, emailResult.errors);
    }
    console.log(`================================================================\n`);

    // 4. Réponse
    return res.status(200).json({
      success: true,
      bookingId,
      message: 'Réservation validée, contrat PDF généré et service e-mail exécuté.',
      contract: {
        generated: true,
        sizeBytes: pdfBuffer.length,
      },
      email: {
        clientSent: emailResult.clientSent,
        clientMessageId: emailResult.clientMessageId || null,
        loueurSent: emailResult.loueurSent,
        loueurMessageId: emailResult.loueurMessageId || null,
        errors: emailResult.errors,
      },
      stripe: {
        sessionCreated: stripeResult.success,
        checkoutUrl: stripeResult.checkoutUrl || null,
        sessionId: stripeResult.sessionId || null,
        error: stripeResult.error || null,
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
    console.error('❌ [Vercel API] Erreur critique non gérée :', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur interne du serveur',
    });
  }
}
