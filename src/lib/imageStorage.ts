import { supabase } from './supabase';

/**
 * Traitement des photos d'annonces.
 *
 * Problème historique : la photo était convertie en base64 et stockée telle
 * quelle dans la colonne `image_url`. Une photo de 5 Mo devenait ~6,7 Mo de
 * texte en base, rechargée à chaque `select`, ce qui alourdissait toute la
 * table et le catalogue public.
 *
 * Nouveau pipeline :
 *   1. compression navigateur (redimensionnement 1600 px + JPEG q=0.82) ;
 *   2. upload dans le bucket public Supabase Storage `equipments` ;
 *   3. repli automatique en data URL compressée si l'upload échoue
 *      (bucket absent, non authentifié, réseau) — l'application ne casse jamais.
 */

const BUCKET = 'equipments';
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export interface PreparedImage {
  url: string;
  source: 'storage' | 'data-url';
  bytes: number;
}

/** Redimensionne et recompresse l'image côté navigateur avant tout envoi. */
const compressImage = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponible dans ce navigateur.'));
          return;
        }

        // Fond blanc : évite les zones noires quand une PNG transparente
        // est convertie en JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression de l'image impossible."));
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Compression impossible.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Ce fichier n'est pas une image lisible."));
    };

    img.src = objectUrl;
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Conversion de image impossible.'));
    reader.readAsDataURL(blob);
  });

/**
 * Prépare une image d'annonce : compression puis upload Storage.
 * Retourne toujours une URL exploitable, même si Storage est indisponible.
 */
export const prepareEquipmentImage = async (
  file: File,
  ownerId?: string
): Promise<PreparedImage> => {
  const blob = await compressImage(file);

  const { data: authData } = await supabase.auth.getUser();
  const effectiveOwnerId = ownerId || authData?.user?.id;

  if (!effectiveOwnerId) {
    return { url: await blobToDataUrl(blob), source: 'data-url', bytes: blob.size };
  }

  const extension = 'jpg';
  const path = `${effectiveOwnerId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  try {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('URL publique indisponible.');

    return { url: data.publicUrl, source: 'storage', bytes: blob.size };
  } catch (err) {
    // Repli silencieux : l'annonce reste enregistrable même sans bucket.
    console.warn(
      "[Storage] Upload de l'image impossible — repli en data URL. " +
        'Exécutez supabase/migrations/06_equipment_images_storage.sql :',
      err
    );
    return { url: await blobToDataUrl(blob), source: 'data-url', bytes: blob.size };
  }
};

/** Indique si une valeur `image_url` est encore un base64 hérité. */
export const isInlineDataUrl = (value?: string | null): boolean =>
  typeof value === 'string' && value.startsWith('data:image/');
