/**
 * ════════════════════════════════════════════════════════════════════════════
 * MATIK — Sécurité serveur (Lot 2)
 * ════════════════════════════════════════════════════════════════════════════
 * Ce module centralise tout ce qui ne doit JAMAIS être décidé par le navigateur :
 *
 *  1. Authentification : chaque appel à /api/booking exige un JWT Supabase valide.
 *  2. Autorisation : un utilisateur ne peut agir que sur SA réservation
 *     (locataire ou loueur de la ligne bookings).
 *  3. Tarification : les montants sont recalculés depuis la table `equipments`
 *     et les dates réelles. Les montants envoyés par le client sont ignorés.
 *
 * Variables d'environnement requises :
 *   - SUPABASE_SERVICE_ROLE_KEY  (obligatoire : lecture/écriture serveur)
 *   - VITE_SUPABASE_URL ou SUPABASE_URL (défaut : projet Matik)
 * ════════════════════════════════════════════════════════════════════════════
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://inozsbkfcbkwlrozdvjj.supabase.co';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Commission Matik appliquée aux frais de service (10 %). */
export const SERVICE_FEE_RATE = 0.1;
/** Garde-fou : une location ne peut pas dépasser un an. */
export const MAX_RENTAL_DAYS = 365;

/** Erreur métier renvoyée au client avec un code HTTP et un code machine. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const isUuid = (value?: string | null): boolean => !!value && UUID_RE.test(value);

/** Environnement de production Vercel (NODE_ENV === 'production'). */
export const isProduction = (): boolean => (process.env.NODE_ENV || '').trim() === 'production';

/** Statuts qui rendent le calendrier indisponible (F2 anti-chevauchement). */
export const ACTIVE_OVERLAP_STATUSES = [
  'en_attente_remise',
  'en_cours',
  'restitution_signalee',
] as const;

/** Sous-ensemble de `req` utilisé ici (compatible Vercel, Edge et Express). */
export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

/** Sous-ensemble de `res` utilisé ici. */
export interface ResponseLike {
  setHeader(name: string, value: string): unknown;
  status(code: number): { json(body: unknown): unknown; end(): unknown };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface EquipmentPricingRow {
  id: string;
  title: string;
  category: string;
  image_url: string | null;
  price_per_day: number;
  deposit_amount: number;
  owner_id: string | null;
  is_published: boolean | null;
}

export interface ServerPricing {
  days: number;
  dailyRate: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  caution: number;
  startDate: string;
  endDate: string;
}

export interface BookingRow {
  id: string;
  booking_reference: string | null;
  equipment_id: string | null;
  equipment_name: string;
  equipment_category: string;
  equipment_image: string;
  locataire_id: string;
  loueur_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  start_date: string;
  end_date: string;
  days: number;
  subtotal: number;
  service_fee: number;
  total_price: number;
  caution_amount: number;
  status: string;
  stripe_caution_status: string;
  stripe_payment_intent_id: string | null;
  stripe_caution_intent_id: string | null;
  stripe_caution_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  caution_authorized_at: string | null;
  payment_confirmed_at: string | null;
  confirmation_email_sent_at: string | null;
  created_at: string;
}

// ─── Client Supabase « service_role » (contourne RLS, jamais exposé au client)

let adminClient: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient => {
  if (adminClient) return adminClient;

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!serviceKey) {
    throw new ApiError(
      503,
      'SERVER_CONFIG_MISSING',
      "Configuration serveur incomplète : la variable d'environnement SUPABASE_SERVICE_ROLE_KEY est requise pour sécuriser les réservations."
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'matik-api-lot2' } },
  });

  return adminClient;
};

// ─── Authentification ────────────────────────────────────────────────────────

const readHeader = (req: RequestLike, name: string): string => {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || '';
  return raw ? String(raw) : '';
};

/** Extrait le JWT `Authorization: Bearer …` de la requête. */
export const getBearerToken = (req: RequestLike): string => {
  const header = readHeader(req, 'authorization');
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
};

/**
 * Vérifie le JWT auprès de Supabase Auth et renvoie l'utilisateur réel.
 * Lève une `ApiError` 401 si le jeton est absent, expiré ou falsifié.
 */
export const requireUser = async (req: RequestLike): Promise<AuthenticatedUser> => {
  const token = getBearerToken(req);
  if (!token) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Connectez-vous pour effectuer cette action.');
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data?.user?.id) {
    throw new ApiError(401, 'AUTH_INVALID', 'Votre session a expiré. Reconnectez-vous puis réessayez.');
  }

  return { id: data.user.id, email: (data.user.email || '').toLowerCase() };
};

// ─── Tarification serveur ────────────────────────────────────────────────────

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Parse une date `YYYY-MM-DD` en UTC (renvoie `null` si invalide). */
const parseIsoDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Charge l'annonce depuis la base. C'est la SEULE source de vérité pour le prix
 * journalier et le montant de la caution.
 */
export const fetchEquipmentForBooking = async (equipmentId: unknown): Promise<EquipmentPricingRow> => {
  const id = typeof equipmentId === 'string' ? equipmentId.trim() : '';

  if (!isUuid(id)) {
    throw new ApiError(
      400,
      'EQUIPMENT_INVALID',
      "Cette annonce n'est pas enregistrée sur la plateforme : la réservation en ligne est indisponible."
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('equipments')
    .select('id,title,category,image_url,price_per_day,deposit_amount,owner_id,is_published')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, 'EQUIPMENT_LOOKUP_FAILED', "Impossible de vérifier l'annonce. Réessayez dans un instant.");
  }

  if (!data) {
    throw new ApiError(404, 'EQUIPMENT_NOT_FOUND', 'Cette annonce est introuvable ou a été supprimée.');
  }

  const equipment = data as EquipmentPricingRow;

  if (equipment.is_published === false) {
    throw new ApiError(400, 'EQUIPMENT_UNAVAILABLE', "Cette annonce n'est plus disponible à la location.");
  }

  if (!equipment.owner_id) {
    throw new ApiError(400, 'EQUIPMENT_NO_OWNER', "Cette annonce n'a pas de propriétaire vérifié.");
  }

  return equipment;
};

/**
 * Recalcule intégralement le prix côté serveur :
 *   sous-total     = tarif journalier × nombre de jours
 *   frais service  = 10 % du sous-total
 *   total location = sous-total + frais service
 *   caution        = montant de caution de l'annonce
 */
export const computeServerPricing = (
  equipment: EquipmentPricingRow,
  rawStartDate: unknown,
  rawEndDate: unknown
): ServerPricing => {
  const start = parseIsoDate(rawStartDate);
  const end = parseIsoDate(rawEndDate);

  if (!start || !end) {
    throw new ApiError(400, 'INVALID_DATES', 'Les dates de location sont invalides.');
  }

  if (end.getTime() < start.getTime()) {
    throw new ApiError(400, 'INVALID_DATES', 'La date de fin doit être postérieure à la date de début.');
  }

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));

  if (days > MAX_RENTAL_DAYS) {
    throw new ApiError(400, 'RENTAL_TOO_LONG', `Une location ne peut pas dépasser ${MAX_RENTAL_DAYS} jours.`);
  }

  const dailyRate = round2(Number(equipment.price_per_day) || 0);
  if (dailyRate <= 0) {
    throw new ApiError(400, 'INVALID_PRICE', "Le tarif de cette annonce n'est pas configuré.");
  }

  const subtotal = round2(dailyRate * days);
  const serviceFee = round2(subtotal * SERVICE_FEE_RATE);
  const total = round2(subtotal + serviceFee);
  const caution = round2(Number(equipment.deposit_amount) || 0);

  return {
    days,
    dailyRate,
    subtotal,
    serviceFee,
    total,
    caution,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

/**
 * Vérifie que le client n'a pas bricolé le total affiché.
 * Un écart > 1 centime signifie que l'annonce a changé de prix entre-temps :
 * on refuse la réservation plutôt que de débiter un montant différent de celui affiché.
 */
export const assertClientAmountsMatch = (body: Record<string, unknown>, pricing: ServerPricing): void => {
  const candidates = [body.totalLocation, body.total_location].filter((value) => value !== undefined && value !== null);
  const declared = Number(candidates[0]);

  if (!Number.isFinite(declared) || Math.abs(declared - pricing.total) <= 0.01) return;

  throw new ApiError(
    409,
    'PRICE_MISMATCH',
    `Le tarif de cette annonce a été mis à jour : ${pricing.total.toFixed(2)} € au lieu de ${declared.toFixed(
      2
    )} €. Rechargez la page puis validez à nouveau le nouveau montant.`,
    { pricing }
  );
};

// ─── Anti-chevauchement des plages (F2) ─────────────────────────────────────

/**
 * Vérifie qu'aucune réservation active ne couvre déjà les dates demandées.
 *
 * Règle semi-ouverte `[)` : un retour le jour J ne bloque pas une nouvelle
 * location commençant le jour J. Concrètement :
 *   ancienne.start_date <= nouvelle.end_date
 *   ancienne.end_date   >= nouvelle.start_date
 *
 * La contrainte d'exclusion PostgreSQL (migration 09) fait foi en base ; ce
 * contrôle serveur renvoie une réponse 409 exploitable par le formulaire
 * avant toute création de session Stripe.
 */
export const assertNoOverlappingBooking = async (
  equipmentId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Promise<void> => {
  if (!isUuid(equipmentId) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new ApiError(400, 'INVALID_DATES', 'Dates ou annonce invalides pour la vérification de disponibilité.');
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from('bookings')
    .select('id, status, start_date, end_date, equipment_name')
    .eq('equipment_id', equipmentId)
    .in('status', ACTIVE_OVERLAP_STATUSES)
    // Chevauchement semi-ouvert : ancienne.start < nouvelle.end ET ancienne.end > nouvelle.start
    // (une location finissant le jour J ne bloque pas une location commençant le jour J).
    .lt('start_date', endDate)
    .gt('end_date', startDate);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(503, 'AVAILABILITY_CHECK_FAILED', 'Impossible de vérifier les disponibilités. Réessayez dans un instant.');
  }

  const conflicts = (data || []).filter((row: any) => {
    const rowStart = String(row.start_date || '').slice(0, 10);
    const rowEnd = String(row.end_date || '').slice(0, 10);
    return rowStart < endDate && rowEnd > startDate;
  });

  if (conflicts.length > 0) {
    throw new ApiError(
      409,
      'EQUIPMENT_UNAVAILABLE_DATES',
      'Cet équipement est déjà réservé sur tout ou partie de ces dates. Choisissez d’autres dates ou un autre matériel.',
      { conflictingBookingIds: conflicts.map((row: any) => row.id) }
    );
  }
};

// ─── Autorisation par ressource ──────────────────────────────────────────────

const sanitizeBookingRef = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/[^A-Za-z0-9_-]/g, '') : '';

/**
 * Charge une réservation et vérifie que l'utilisateur est bien le locataire
 * ou le loueur concerné. Toute autre personne reçoit un 403.
 */
export const fetchBookingForUser = async (bookingRef: unknown, userId: string): Promise<BookingRow> => {
  const ref = sanitizeBookingRef(bookingRef);

  if (!ref) {
    throw new ApiError(400, 'BOOKING_ID_REQUIRED', 'Référence de réservation manquante.');
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('bookings')
    .select('*')
    .or(`id.eq.${ref},booking_reference.eq.${ref}`)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, 'BOOKING_LOOKUP_FAILED', 'Impossible de vérifier la réservation.');
  }

  if (!data) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Réservation introuvable.');
  }

  const booking = data as BookingRow;

  if (booking.locataire_id !== userId && booking.loueur_id !== userId) {
    throw new ApiError(403, 'FORBIDDEN', "Vous n'avez pas accès à cette réservation.");
  }

  return booking;
};

// ─── CORS ────────────────────────────────────────────────────────────────────

const normalizeOrigin = (value: string): string => value.trim().replace(/\/+$/, '').toLowerCase();

/** Origines explicitement autorisées (APP_URL, ALLOWED_ORIGINS) + même origine. */
export const getAllowedOrigins = (reqHost?: string): Set<string> => {
  const origins = new Set<string>();

  const add = (value?: string) => {
    if (!value) return;
    value
      .split(',')
      .map((item) => normalizeOrigin(item))
      .filter(Boolean)
      .forEach((item) => origins.add(item));
  };

  add(process.env.APP_URL);
  add(process.env.ALLOWED_ORIGINS);

  if (reqHost) {
    origins.add(normalizeOrigin(`https://${reqHost}`));
    origins.add(normalizeOrigin(`http://${reqHost}`));
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://localhost:5173');
    origins.add('http://localhost:3001');
  }

  return origins;
};

/**
 * Applique les en-têtes CORS uniquement pour les origines connues.
 * Remplace l'ancien `Access-Control-Allow-Origin: *`.
 */
export const applyCors = (req: RequestLike, res: ResponseLike, reqHost?: string): void => {
  const rawOrigin = readHeader(req, 'origin');
  const origin = rawOrigin ? normalizeOrigin(rawOrigin) : '';

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (origin && getAllowedOrigins(reqHost).has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', rawOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
};

// ─── Réponses d'erreur homogènes ─────────────────────────────────────────────

export const toErrorPayload = (error: unknown): { status: number; body: Record<string, unknown> } => {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  const message = error instanceof Error ? error.message : 'Erreur interne du serveur';
  return { status: 500, body: { success: false, error: message, code: 'INTERNAL_ERROR' } };
};
