import { ApiError, getSupabaseAdmin, getBearerToken } from "./bookingSecurity.js";
const INSPECTION_BUCKET = "inspection-videos";
const getInspectionAdmin = () => getSupabaseAdmin();
const extractStoragePath = (row) => {
  if (row.video_path && !row.video_path.startsWith("http")) return row.video_path;
  const url = row.video_url || "";
  const marker = `/public/${INSPECTION_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let path = url.slice(idx + marker.length);
  try {
    path = decodeURIComponent(path);
  } catch {
  }
  return path || null;
};
const removeInspectionVideoObject = async (admin, row) => {
  const path = extractStoragePath(row);
  if (!path) return;
  try {
    const { error } = await admin.storage.from(INSPECTION_BUCKET).remove([path]);
    if (error) {
      console.warn("[Inspections] Suppression Storage impossible (d\xE9j\xE0 absent ?) :", error.message);
    }
  } catch (err) {
    console.warn("[Inspections] Exception suppression Storage :", err?.message || err);
  }
};
const authorizeInspectionAccess = async (row, req, { requireOwner }) => {
  const token = getBearerToken(req);
  if (!token) {
    if (requireOwner) {
      throw new ApiError(401, "AUTH_REQUIRED", "Connectez-vous pour refaire cet \xE9tat des lieux.");
    }
    return { ownerId: row.user_id, anonymousLink: true };
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new ApiError(401, "AUTH_INVALID", "Session invalide ou expir\xE9e. Reconnectez-vous.");
  }
  if (row.user_id && row.user_id !== data.user.id) {
    throw new ApiError(403, "FORBIDDEN_INSPECTION", "Vous n'\xEAtes pas autoris\xE9 \xE0 modifier cet \xE9tat des lieux.");
  }
  return { ownerId: data.user.id, anonymousLink: false };
};
const fetchInspectionRow = async (id) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError(400, "INSPECTION_INVALID", "Identifiant d\u2019\xE9tat des lieux invalide.");
  }
  const admin = getInspectionAdmin();
  const { data, error } = await admin.from("video_inspections").select(
    "id,user_id,item_title,category,inspection_type,notes,video_url,video_path,video_mime_type,video_duration_seconds,client_validated_at,replaced_at,created_at"
  ).eq("id", id).maybeSingle();
  if (error) {
    console.error("[Inspections] Lecture impossible :", error.message);
    throw new ApiError(500, "INSPECTION_LOOKUP_FAILED", "Impossible de charger cet \xE9tat des lieux.");
  }
  return data || null;
};
export {
  INSPECTION_BUCKET,
  authorizeInspectionAccess,
  extractStoragePath,
  fetchInspectionRow,
  getInspectionAdmin,
  removeInspectionVideoObject
};
