import { Resend } from 'resend';
import {
  ApiError,
  applyCors,
  fetchBookingForUser,
  getSupabaseAdmin,
  requireUser,
  toErrorPayload,
} from './lib/bookingSecurity.js';

/**
 * MATIK — Messagerie interne par réservation.
 *
 * GET  /api/messages?bookingId=MAT-…  → liste des messages
 * POST /api/messages { bookingId, body } → envoi + notification e-mail
 *
 * Règles :
 *  - JWT Supabase obligatoire ; seuls le locataire et le loueur y ont accès.
 *  - Aucun message possible tant que le paiement n'est pas confirmé par le
 *    webhook Stripe (`payment_confirmed_at`).
 *  - Le rôle de l'expéditeur est calculé côté serveur, jamais fourni par le client.
 */

const MESSAGE_MAX_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 10;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const readBody = (req: any): Record<string, any> => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
};

const readBookingRef = (req: any, body: Record<string, any>): string => {
  if (typeof body.bookingId === 'string') return body.bookingId;
  if (typeof body.booking_id === 'string') return body.booking_id;

  try {
    const url = new URL(String(req.url || ''), `https://${req.headers?.host || 'localhost'}`);
    return url.searchParams.get('bookingId') || url.searchParams.get('booking_id') || '';
  } catch {
    return '';
  }
};

const sendMessageNotification = async (params: {
  to: string;
  senderName: string;
  counterpartName: string;
  equipmentName: string;
  bookingId: string;
  body: string;
  senderRole: 'locataire' | 'loueur';
}): Promise<boolean> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim() || !params.to) return false;

  const appUrl = (process.env.APP_URL || 'https://matikilou.com').replace(/\/+$/, '');
  const rawSender = (process.env.EMAIL_FROM || '').trim();
  const from = rawSender
    ? rawSender.includes('<')
      ? rawSender
      : `Matik <${rawSender}>`
    : 'Matik <onboarding@resend.dev>';

  const roleLabel = params.senderRole === 'locataire' ? 'locataire' : 'loueur';
  const subject = `[Matik] Nouveau message de votre ${roleLabel} — ${params.equipmentName}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:24px 28px;">
    <h1 style="margin:0;color:#0F172A;font-size:20px;font-weight:900;">MATIK</h1>
    <p style="margin:4px 0 0;color:#44403C;font-size:12px;">Messagerie de réservation</p>
  </td></tr>
  <tr><td style="padding:28px;">
    <p style="font-size:14px;color:#0F172A;margin:0 0 12px;">Bonjour ${escapeHtml(params.counterpartName || '')},</p>
    <p style="font-size:13px;color:#334155;line-height:1.6;margin:0 0 18px;">
      <strong>${escapeHtml(params.senderName || 'Votre contrepartie')}</strong>
      vous a envoyé un message au sujet de
      <strong>${escapeHtml(params.equipmentName || 'votre réservation')}</strong>
      (réf. ${escapeHtml(params.bookingId)}).
    </p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #F59E0B;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#0F172A;line-height:1.6;white-space:pre-wrap;">${escapeHtml(params.body)}</p>
    </div>
    <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0 0 18px;">
      Répondez depuis la messagerie sécurisée de votre espace Matik.
    </p>
    <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#F59E0B;color:#0F172A;text-decoration:none;font-weight:800;font-size:13px;padding:12px 20px;border-radius:10px;">
      Ouvrir mon espace Matik
    </a>
  </td></tr>
  <tr><td style="padding:16px 28px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
    <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
      © ${new Date().getFullYear()} Matik — Ne répondez pas directement à cet e-mail.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const resend = new Resend(apiKey.trim());
    const result = await resend.emails.send({
      from,
      to: [params.to],
      subject,
      html,
    });

    if (result.error) {
      console.warn('[Matik Messages] Notification e-mail refusée :', result.error.message);
      return false;
    }

    return Boolean(result.data?.id);
  } catch (err: any) {
    console.warn('[Matik Messages] Notification e-mail impossible :', err?.message || err);
    return false;
  }
};

export default async function handler(req: any, res: any) {
  applyCors(req, res, req.headers?.host);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      error: 'Méthode non autorisée.',
    });
  }

  try {
    const user = await requireUser(req);
    const body = readBody(req);
    const booking = await fetchBookingForUser(readBookingRef(req, body), user.id);

    if (!booking.payment_confirmed_at) {
      throw new ApiError(
        403,
        'PAYMENT_NOT_CONFIRMED',
        "La messagerie sera disponible dès que le paiement de la location sera confirmé. Aucune coordonnée n'est échangée avant cette étape."
      );
    }

    const admin = getSupabaseAdmin();
    const isTenant = booking.locataire_id === user.id;
    const senderRole: 'locataire' | 'loueur' = isTenant ? 'locataire' : 'loueur';

    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('booking_messages')
        .select('id,booking_id,sender_role,body,created_at')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        throw new ApiError(500, 'MESSAGES_LOAD_FAILED', 'Impossible de charger la messagerie.');
      }

      return res.status(200).json({
        success: true,
        messages: (data || []).map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          senderRole: row.sender_role,
          body: row.body,
          createdAt: row.created_at,
          mine: row.sender_role === senderRole,
        })),
      });
    }

    // ─── POST : envoi d'un message ───
    const text = typeof body.body === 'string' ? body.body.trim() : '';

    if (!text) {
      throw new ApiError(400, 'MESSAGE_EMPTY', 'Le message est vide.');
    }
    if (text.length > MESSAGE_MAX_LENGTH) {
      throw new ApiError(400, 'MESSAGE_TOO_LONG', `Le message ne doit pas dépasser ${MESSAGE_MAX_LENGTH} caractères.`);
    }

    // Anti-flood simple : 10 messages maximum par minute et par expéditeur.
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await admin
      .from('booking_messages')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking.id)
      .eq('sender_id', user.id)
      .gte('created_at', since);

    if ((count || 0) >= RATE_LIMIT_MAX_MESSAGES) {
      throw new ApiError(
        429,
        'MESSAGE_RATE_LIMITED',
        'Vous avez envoyé trop de messages en peu de temps. Patientez une minute avant de réessayer.'
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from('booking_messages')
      .insert({
        booking_id: booking.id,
        sender_id: user.id,
        sender_role: senderRole,
        body: text,
      })
      .select('id,booking_id,sender_role,body,created_at')
      .single();

    if (insertError || !inserted) {
      console.error('[Matik Messages] Insertion impossible :', insertError?.message);
      throw new ApiError(500, 'MESSAGE_SEND_FAILED', "Le message n'a pas pu être enregistré.");
    }

    const senderName = isTenant ? booking.client_name : booking.owner_name || '';
    const counterpartName = isTenant ? booking.owner_name || '' : booking.client_name;
    const counterpartEmail = isTenant ? booking.owner_email || '' : booking.client_email;

    const emailSent = await sendMessageNotification({
      to: counterpartEmail,
      senderName,
      counterpartName,
      equipmentName: booking.equipment_name,
      bookingId: booking.id,
      body: text,
      senderRole,
    });

    return res.status(201).json({
      success: true,
      emailSent,
      message: {
        id: inserted.id,
        bookingId: inserted.booking_id,
        senderRole: inserted.sender_role,
        body: inserted.body,
        createdAt: inserted.created_at,
        mine: true,
      },
    });
  } catch (error) {
    const { status, body: errorBody } = toErrorPayload(error);
    if (status >= 500) {
      console.error('[Matik Messages] Erreur critique :', error);
    }
    return res.status(status).json(errorBody);
  }
}
