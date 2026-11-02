import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  return new Resend(apiKey.trim());
}

export interface EmailData {
  bookingId: string;
  // Client
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  // Loueur
  loueurNom: string;
  loueurEmail: string;
  // Équipement & dates
  equipmentName: string;
  equipmentCategory: string;
  startDate: string;
  endDate: string;
  dureeJours: number;
  // Tarifs
  sousTotal: number;
  fraisService: number;
  totalLocation: number;
  montantCaution: number;
  // Stripe
  stripeCheckoutUrl?: string;
}

function buildEmailHTML(data: EmailData, role: 'client' | 'loueur'): string {
  const isClient = role === 'client';
  const greeting = isClient
    ? `Bonjour ${data.clientPrenom},`
    : `Bonjour ${data.loueurNom},`;

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
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:28px 32px;">
    <h1 style="margin:0;color:#0F172A;font-size:22px;font-weight:900;letter-spacing:-0.5px;">MATIK</h1>
    <p style="margin:4px 0 0;color:#44403C;font-size:12px;">Location de Matériel & Équipements</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="font-size:15px;color:#0F172A;margin:0 0 16px;">${greeting}</p>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 24px;">${intro}</p>

    <!-- Récapitulatif -->
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
          ${isClient ? `
          <tr><td style="color:#64748B;">Loueur :</td><td style="font-weight:600;">${data.loueurNom}</td></tr>
          ` : `
          <tr><td style="color:#64748B;">Locataire :</td><td style="font-weight:600;">${data.clientPrenom} ${data.clientNom}</td></tr>
          <tr><td style="color:#64748B;">E-mail client :</td><td>${data.clientEmail}</td></tr>
          `}
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
      ${isClient
        ? 'Vous trouverez votre contrat de location en pièce jointe. Conservez cet e-mail comme justificatif.'
        : 'Le contrat de location est joint à cet e-mail. Le locataire a reçu le même document.'}
    </p>
  </td></tr>

  <!-- Footer -->
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
 * Envoie l'e-mail de confirmation de réservation au client ET au loueur
 * avec le contrat PDF en pièce jointe.
 */
export async function sendBookingEmails(
  data: EmailData,
  contractPdfBuffer: Buffer
): Promise<{ clientSent: boolean; loueurSent: boolean; errors: string[] }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn('⚠️ [Email] RESEND_API_KEY non configurée — envoi ignoré.');
    return { clientSent: false, loueurSent: false, errors: ['RESEND_API_KEY non configurée dans .env'] };
  }

  const senderAddress = process.env.EMAIL_FROM || 'Matik <noreply@matik.fr>';
  const errors: string[] = [];
  let clientSent = false;
  let loueurSent = false;

  const attachment = {
    filename: `contrat-location-${data.bookingId}.pdf`,
    content: contractPdfBuffer.toString('base64'),
  };

  // ─── E-mail au Client ─────────────────────────────────
  try {
    await resend.emails.send({
      from: senderAddress,
      to: [data.clientEmail],
      subject: `[Matik] Votre contrat de location #${data.bookingId} — ${data.equipmentName}`,
      html: buildEmailHTML(data, 'client'),
      attachments: [attachment],
    });
    clientSent = true;
    console.log(`✅ [Email] Confirmation envoyée au client : ${data.clientEmail}`);
  } catch (err: any) {
    const msg = `Erreur envoi e-mail client (${data.clientEmail}): ${err?.message || err}`;
    console.error(`❌ [Email]`, msg);
    errors.push(msg);
  }

  // ─── E-mail au Loueur ─────────────────────────────────
  if (data.loueurEmail) {
    try {
      await resend.emails.send({
        from: senderAddress,
        to: [data.loueurEmail],
        subject: `[Matik] Nouvelle réservation #${data.bookingId} — ${data.equipmentName}`,
        html: buildEmailHTML(data, 'loueur'),
        attachments: [attachment],
      });
      loueurSent = true;
      console.log(`✅ [Email] Notification envoyée au loueur : ${data.loueurEmail}`);
    } catch (err: any) {
      const msg = `Erreur envoi e-mail loueur (${data.loueurEmail}): ${err?.message || err}`;
      console.error(`❌ [Email]`, msg);
      errors.push(msg);
    }
  }

  return { clientSent, loueurSent, errors };
}
