import { createClient } from "@supabase/supabase-js";
const DEFAULT_SUPABASE_URL = "https://inozsbkfcbkwlrozdvjj.supabase.co";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SERVICE_FEE_RATE = 0.1;
const MAX_RENTAL_DAYS = 365;
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
const isUuid = (value) => !!value && UUID_RE.test(value);
const isProduction = () => (process.env.NODE_ENV || "").trim() === "production";
const ACTIVE_OVERLAP_STATUSES = [
  "en_attente_remise",
  "en_cours",
  "restitution_signalee"
];
let adminClient = null;
const getSupabaseAdmin = () => {
  if (adminClient) return adminClient;
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!serviceKey) {
    throw new ApiError(
      503,
      "SERVER_CONFIG_MISSING",
      "Configuration serveur incompl\xE8te : la variable d'environnement SUPABASE_SERVICE_ROLE_KEY est requise pour s\xE9curiser les r\xE9servations."
    );
  }
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "matik-api-lot2" } }
  });
  return adminClient;
};
const readHeader = (req, name) => {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || "";
  return raw ? String(raw) : "";
};
const getBearerToken = (req) => {
  const header = readHeader(req, "authorization");
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : "";
};
const requireUser = async (req) => {
  const token = getBearerToken(req);
  if (!token) {
    throw new ApiError(401, "AUTH_REQUIRED", "Connectez-vous pour effectuer cette action.");
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new ApiError(401, "AUTH_INVALID", "Votre session a expir\xE9. Reconnectez-vous puis r\xE9essayez.");
  }
  return { id: data.user.id, email: (data.user.email || "").toLowerCase() };
};
const round2 = (value) => Math.round(value * 100) / 100;
const parseIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = /* @__PURE__ */ new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const fetchEquipmentForBooking = async (equipmentId) => {
  const id = typeof equipmentId === "string" ? equipmentId.trim() : "";
  if (!isUuid(id)) {
    throw new ApiError(
      400,
      "EQUIPMENT_INVALID",
      "Cette annonce n'est pas enregistr\xE9e sur la plateforme : la r\xE9servation en ligne est indisponible."
    );
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("equipments").select("id,title,category,image_url,price_per_day,deposit_amount,owner_id,is_published").eq("id", id).maybeSingle();
  if (error) {
    throw new ApiError(500, "EQUIPMENT_LOOKUP_FAILED", "Impossible de v\xE9rifier l'annonce. R\xE9essayez dans un instant.");
  }
  if (!data) {
    throw new ApiError(404, "EQUIPMENT_NOT_FOUND", "Cette annonce est introuvable ou a \xE9t\xE9 supprim\xE9e.");
  }
  const equipment = data;
  if (equipment.is_published === false) {
    throw new ApiError(400, "EQUIPMENT_UNAVAILABLE", "Cette annonce n'est plus disponible \xE0 la location.");
  }
  if (!equipment.owner_id) {
    throw new ApiError(400, "EQUIPMENT_NO_OWNER", "Cette annonce n'a pas de propri\xE9taire v\xE9rifi\xE9.");
  }
  return equipment;
};
const computeServerPricing = (equipment, rawStartDate, rawEndDate) => {
  const start = parseIsoDate(rawStartDate);
  const end = parseIsoDate(rawEndDate);
  if (!start || !end) {
    throw new ApiError(400, "INVALID_DATES", "Les dates de location sont invalides.");
  }
  if (end.getTime() < start.getTime()) {
    throw new ApiError(400, "INVALID_DATES", "La date de fin doit \xEAtre post\xE9rieure \xE0 la date de d\xE9but.");
  }
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 864e5));
  if (days > MAX_RENTAL_DAYS) {
    throw new ApiError(400, "RENTAL_TOO_LONG", `Une location ne peut pas d\xE9passer ${MAX_RENTAL_DAYS} jours.`);
  }
  const dailyRate = round2(Number(equipment.price_per_day) || 0);
  if (dailyRate <= 0) {
    throw new ApiError(400, "INVALID_PRICE", "Le tarif de cette annonce n'est pas configur\xE9.");
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
    endDate: end.toISOString().slice(0, 10)
  };
};
const assertClientAmountsMatch = (body, pricing) => {
  const candidates = [body.totalLocation, body.total_location].filter((value) => value !== void 0 && value !== null);
  const declared = Number(candidates[0]);
  if (!Number.isFinite(declared) || Math.abs(declared - pricing.total) <= 0.01) return;
  throw new ApiError(
    409,
    "PRICE_MISMATCH",
    `Le tarif de cette annonce a \xE9t\xE9 mis \xE0 jour : ${pricing.total.toFixed(2)} \u20AC au lieu de ${declared.toFixed(
      2
    )} \u20AC. Rechargez la page puis validez \xE0 nouveau le nouveau montant.`,
    { pricing }
  );
};
const assertNoOverlappingBooking = async (equipmentId, startDate, endDate, excludeBookingId) => {
  if (!isUuid(equipmentId) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new ApiError(400, "INVALID_DATES", "Dates ou annonce invalides pour la v\xE9rification de disponibilit\xE9.");
  }
  const admin = getSupabaseAdmin();
  let query = admin.from("bookings").select("id, status, start_date, end_date, equipment_name").eq("equipment_id", equipmentId).in("status", ACTIVE_OVERLAP_STATUSES).lt("start_date", endDate).gt("end_date", startDate);
  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }
  const { data, error } = await query;
  if (error) {
    throw new ApiError(503, "AVAILABILITY_CHECK_FAILED", "Impossible de v\xE9rifier les disponibilit\xE9s. R\xE9essayez dans un instant.");
  }
  const conflicts = (data || []).filter((row) => {
    const rowStart = String(row.start_date || "").slice(0, 10);
    const rowEnd = String(row.end_date || "").slice(0, 10);
    return rowStart < endDate && rowEnd > startDate;
  });
  if (conflicts.length > 0) {
    throw new ApiError(
      409,
      "EQUIPMENT_UNAVAILABLE_DATES",
      "Cet \xE9quipement est d\xE9j\xE0 r\xE9serv\xE9 sur tout ou partie de ces dates. Choisissez d\u2019autres dates ou un autre mat\xE9riel.",
      { conflictingBookingIds: conflicts.map((row) => row.id) }
    );
  }
};
const sanitizeBookingRef = (value) => typeof value === "string" ? value.trim().replace(/[^A-Za-z0-9_-]/g, "") : "";
const fetchBookingForUser = async (bookingRef, userId) => {
  const ref = sanitizeBookingRef(bookingRef);
  if (!ref) {
    throw new ApiError(400, "BOOKING_ID_REQUIRED", "R\xE9f\xE9rence de r\xE9servation manquante.");
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("bookings").select("*").or(`id.eq.${ref},booking_reference.eq.${ref}`).maybeSingle();
  if (error) {
    throw new ApiError(500, "BOOKING_LOOKUP_FAILED", "Impossible de v\xE9rifier la r\xE9servation.");
  }
  if (!data) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "R\xE9servation introuvable.");
  }
  const booking = data;
  if (booking.locataire_id !== userId && booking.loueur_id !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas acc\xE8s \xE0 cette r\xE9servation.");
  }
  return booking;
};
const normalizeOrigin = (value) => value.trim().replace(/\/+$/, "").toLowerCase();
const getAllowedOrigins = (reqHost) => {
  const origins = /* @__PURE__ */ new Set();
  const add = (value) => {
    if (!value) return;
    value.split(",").map((item) => normalizeOrigin(item)).filter(Boolean).forEach((item) => origins.add(item));
  };
  add(process.env.APP_URL);
  add(process.env.ALLOWED_ORIGINS);
  if (reqHost) {
    origins.add(normalizeOrigin(`https://${reqHost}`));
    origins.add(normalizeOrigin(`http://${reqHost}`));
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:5173");
    origins.add("http://localhost:3001");
  }
  return origins;
};
const applyCors = (req, res, reqHost) => {
  const rawOrigin = readHeader(req, "origin");
  const origin = rawOrigin ? normalizeOrigin(rawOrigin) : "";
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (origin && getAllowedOrigins(reqHost).has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", rawOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
};
const toErrorPayload = (error) => {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        success: false,
        error: error.message,
        code: error.code,
        ...error.details ? { details: error.details } : {}
      }
    };
  }
  const message = error instanceof Error ? error.message : "Erreur interne du serveur";
  return { status: 500, body: { success: false, error: message, code: "INTERNAL_ERROR" } };
};
export {
  ACTIVE_OVERLAP_STATUSES,
  ApiError,
  MAX_RENTAL_DAYS,
  SERVICE_FEE_RATE,
  applyCors,
  assertClientAmountsMatch,
  assertNoOverlappingBooking,
  computeServerPricing,
  fetchBookingForUser,
  fetchEquipmentForBooking,
  getAllowedOrigins,
  getBearerToken,
  getSupabaseAdmin,
  isProduction,
  isUuid,
  requireUser,
  toErrorPayload
};
