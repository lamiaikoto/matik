import { supabase } from './supabase';
import { Equipment } from '../types';
import { anonymizeFullName, stripAccountNicknames, resolvePublicDisplayName } from './publicIdentity';

/**
 * Structure de la table 'equipments' dans Supabase :
 * - id: UUID (Primary Key)
 * - title: TEXT (Nom de l'équipement)
 * - description: TEXT (Description avec métadonnées JSON encodées)
 * - category: TEXT (Catégorie universelle)
 * - price_per_day: NUMERIC (Tarif de location journalier en €)
 * - deposit_amount: NUMERIC (Montant de la caution obligatoire Stripe en €)
 * - image_url: TEXT (URL de l'image principale de l'équipement)
 * - owner_id: UUID (Identifiant de l'utilisateur propriétaire dans auth.users)
 * - is_published: BOOLEAN (True = visible publiquement dans le catalogue)
 * - city: TEXT (Ville de retrait — colonne optionnelle, migration 03)
 * - region: TEXT (Région française — colonne optionnelle, migration 03)
 * - postal_code: TEXT (Code postal — colonne optionnelle, migration 03)
 * - created_at: TIMESTAMPTZ (Date de création de l'annonce)
 */
export interface SupabaseEquipmentRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_per_day: number;
  deposit_amount: number;
  image_url: string;
  owner_id: string;
  is_published: boolean;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  created_at: string;
}

interface EquipmentMetadata {
  city?: string;
  postalCode?: string;
  region?: string;
  specs?: { label: string; value: string }[];
  partnerArtisan?: string;
  /** true dès que le loueur a choisi/modifié librement son nom public (annonces récentes). */
  displayNameChosen?: boolean;
  condition?: 'neuf' | 'tres_bon_etat' | 'bon_etat';
  tags?: string[];
  ownerType?: 'pro' | 'particulier';
  ownerName?: string;
  // ⚠️ Les coordonnées du loueur (e-mail, téléphone) ne sont plus JAMAIS stockées
  // ici : la colonne `description` d'`equipments` est lisible publiquement.
  // Elles sont résolues côté serveur au moment de la réservation (api/booking.ts).
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Colonnes réellement nécessaires au catalogue.
 * On ne fait plus `select('*')` : la table contient des champs internes
 * (métadonnées, colonnes futures) qui n'ont rien à faire dans le navigateur.
 */
const EQUIPMENT_COLUMNS_BASE = [
  'id',
  'title',
  'description',
  'category',
  'price_per_day',
  'deposit_amount',
  'image_url',
  'owner_id',
  'is_published',
  'created_at',
].join(',');

const EQUIPMENT_COLUMNS_WITH_LOCATION = `${EQUIPMENT_COLUMNS_BASE},city,region,postal_code`;

const isMissingColumnError = (error: { code?: string; message?: string } | null): boolean =>
  !!error &&
  (error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist/i.test(error.message || ''));

/**
 * Lecture des annonces avec colonnes explicites + repli automatique lorsque la
 * migration 03 (city / region / postal_code) n'a pas encore été exécutée.
 * Dans ce cas, la localisation reste disponible via les métadonnées.
 */
const selectEquipments = async (applyFilters: (query: any) => any): Promise<any> => {
  const run = (columns: string) => applyFilters(supabase.from('equipments').select(columns));

  const firstName = await run(EQUIPMENT_COLUMNS_WITH_LOCATION);
  if (!isMissingColumnError(firstName.error)) return firstName;

  console.warn(
    '[Supabase equipments] Colonnes de localisation absentes — exécutez supabase/migrations/03_add_location_fields.sql. Repli sur les métadonnées.'
  );
  return await run(EQUIPMENT_COLUMNS_BASE);
};

/**
 * Vérifie si une chaîne est un UUID valide pour PostgreSQL
 */
export const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return UUID_REGEX.test(id);
};

/**
 * Générateur d'UUID v4 standardisé (navigateurs & Node)
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Extrait la description textuelle propre et les métadonnées optionnelles
 */
export const parseDescriptionWithMetadata = (rawDescription: string | null): {
  cleanDescription: string;
  metadata: EquipmentMetadata;
} => {
  if (!rawDescription) {
    return { cleanDescription: '', metadata: {} };
  }

  const metaMatch = rawDescription.match(/<!--\s*MATIK_META:([\s\S]*?)-->/);
  if (!metaMatch) {
    return { cleanDescription: rawDescription.trim(), metadata: {} };
  }

  const cleanDescription = rawDescription.replace(/<!--\s*MATIK_META:[\s\S]*?-->/g, '').trim();
  try {
    const metadata: EquipmentMetadata = JSON.parse(metaMatch[1]);
    return { cleanDescription, metadata };
  } catch {
    return { cleanDescription, metadata: {} };
  }
};

/**
 * Encode les métadonnées dans la description pour un stockage sans perte dans Supabase
 */
export const encodeDescriptionWithMetadata = (
  cleanDescription: string,
  metadata: EquipmentMetadata
): string => {
  const baseText = (cleanDescription || '').replace(/<!--\s*MATIK_META:[\s\S]*?-->/g, '').trim();
  const metaString = JSON.stringify(metadata);
  return `${baseText}\n\n<!-- MATIK_META:${metaString} -->`;
};

/**
 * Transforme une ligne issue de Supabase `equipments` en objet `Equipment` pour l'application
 */
export const mapSupabaseRowToEquipment = (row: SupabaseEquipmentRow): Equipment => {
  const { cleanDescription, metadata } = parseDescriptionWithMetadata(row.description);

  return {
    id: row.id,
    name: row.title || 'Équipement sans titre',
    category: row.category || 'Bricolage & Outillage BTP',
    dailyRate: Number(row.price_per_day) || 0,
    depositAmount: Number(row.deposit_amount) || 0,
    image: row.image_url || '',
    description: cleanDescription || 'Équipement vérifié et garanti avec caution sécurisée Stripe sans débit.',
    partnerArtisan: resolvePublicDisplayName(
      metadata.partnerArtisan,
      metadata.ownerName,
      metadata.displayNameChosen === true
    ),
    city: row.city || metadata.city || 'France',
    postalCode: row.postal_code || metadata.postalCode || '',
    region: row.region || metadata.region || '',
    condition: metadata.condition || 'tres_bon_etat',
    tags: metadata.tags || [],
    specs: Array.isArray(metadata.specs) ? metadata.specs : [],
    inStock: true,
    isActive: row.is_published !== false,
    is_published: row.is_published !== false,
    ownerType: metadata.ownerType || 'particulier',
    ownerId: row.owner_id || undefined,
    ownerName: metadata.ownerName || metadata.partnerArtisan || '',
    // Coordonnées volontairement vides : elles ne transitent plus par une table
    // publique. Le serveur les récupère depuis `auth.users` à la réservation.
    ownerEmail: '',
    ownerPhone: '',
    createdAt: row.created_at || new Date().toISOString(),
  };
};

/**
 * Récupère l'ensemble des équipements publiés et actifs pour le catalogue public
 * Requête filtrant explicitement sur `is_published = true`
 */
export const fetchEquipmentsFromSupabase = async (): Promise<Equipment[]> => {
  try {
    const { data, error } = await selectEquipments((query) =>
      query.eq('is_published', true).order('created_at', { ascending: false })
    );

    if (error) {
      console.warn('[Supabase equipments] Erreur lors du chargement des annonces publiques:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((row) => mapSupabaseRowToEquipment(row as SupabaseEquipmentRow));
    }
    return [];
  } catch (err) {
    console.error('[Supabase equipments] Exception fetchEquipmentsFromSupabase:', err);
    return [];
  }
};

/**
 * Récupère l'ensemble des équipements d'un propriétaire spécifique (actifs ou inactifs)
 */
export const fetchUserEquipmentsFromSupabase = async (userId: string): Promise<Equipment[]> => {
  try {
    if (!userId || !isValidUUID(userId)) return [];

    const { data, error } = await selectEquipments((query) =>
      query.eq('owner_id', userId).order('created_at', { ascending: false })
    );

    if (error) {
      console.warn('[Supabase equipments] Erreur chargement annonces utilisateur:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((row) => mapSupabaseRowToEquipment(row as SupabaseEquipmentRow));
    }
    return [];
  } catch (err) {
    console.error('[Supabase equipments] Exception fetchUserEquipmentsFromSupabase:', err);
    return [];
  }
};

/**
 * Enregistre (création ou mise à jour) une annonce dans la table Supabase `equipments`
 * - Garantit que `is_published` est bien positionné à `true` par défaut.
 * - Garantit un UUID valide compatible PostgreSQL.
 */
export const saveEquipmentToSupabase = async (
  equipment: Equipment,
  currentUserId?: string
): Promise<{ success: boolean; data?: Equipment; error?: any }> => {
  try {
    // 1. Détermine l'identifiant du propriétaire (auth.uid)
    let effectiveOwnerId = equipment.ownerId || currentUserId;
    if (!effectiveOwnerId || !isValidUUID(effectiveOwnerId)) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id && isValidUUID(authData.user.id)) {
        effectiveOwnerId = authData.user.id;
      }
    }

    // 2. Garantit un identifiant UUID conforme
    const finalId = isValidUUID(equipment.id) ? equipment.id : generateUUID();

    // 3. Statut de publication : TOUJOURS TRUE par défaut lors de la création d'une nouvelle annonce
    const isPublished = equipment.is_published !== undefined
      ? equipment.is_published
      : equipment.isActive !== false;

    // 4. Encapsulation des métadonnées (dont la localisation, conservée en secours)
    const metadata: EquipmentMetadata = {
      city: equipment.city || 'France',
      postalCode: equipment.postalCode || '',
      region: equipment.region || '',
      partnerArtisan: equipment.partnerArtisan,
      displayNameChosen: true,
      specs: equipment.specs || [],
      condition: equipment.condition,
      tags: equipment.tags || [],
      ownerType: equipment.ownerType || 'particulier',
      ownerName: equipment.ownerName || equipment.partnerArtisan || '',
    };

    const finalDescription = encodeDescriptionWithMetadata(equipment.description, metadata);

    const basePayload = {
      id: finalId,
      title: equipment.name.trim(),
      description: finalDescription,
      category: equipment.category,
      price_per_day: Number(equipment.dailyRate),
      deposit_amount: Number(equipment.depositAmount),
      image_url: equipment.image,
      is_published: isPublished, // ✅ Toujours true par défaut pour visibilité dans le catalogue public
      ...(effectiveOwnerId && isValidUUID(effectiveOwnerId) ? { owner_id: effectiveOwnerId } : {}),
      created_at: equipment.createdAt || new Date().toISOString(),
    };

    const locationPayload = {
      city: equipment.city?.trim() || null,
      region: equipment.region?.trim() || null,
      postal_code: equipment.postalCode?.trim() || null,
    };

    let { data, error } = await supabase
      .from('equipments')
      .upsert({ ...basePayload, ...locationPayload }, { onConflict: 'id' })
      .select()
      .single();

    // Les colonnes de localisation peuvent ne pas encore exister (migration 03 non exécutée).
    // On réessaie alors sans elles : ville, région et code postal restent enregistrés
    // dans les métadonnées de la description, donc aucune donnée n'est perdue.
    if (
      error &&
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        /column .* does not exist/i.test(error.message || ''))
    ) {
      console.warn(
        '[Supabase equipments] Colonnes de localisation absentes — exécutez supabase/migrations/03_add_location_fields.sql. Enregistrement via métadonnées.'
      );
      ({ data, error } = await supabase
        .from('equipments')
        .upsert(basePayload, { onConflict: 'id' })
        .select()
        .single());
    }

    if (error) {
      console.error('[Supabase equipments] Erreur insertion/mise à jour:', error);
      return { success: false, error };
    }

    const saved = mapSupabaseRowToEquipment(data as SupabaseEquipmentRow);
    return { success: true, data: saved };
  } catch (err) {
    console.error('[Supabase equipments] Exception saveEquipmentToSupabase:', err);
    return { success: false, error: err };
  }
};

/**
 * Active ou désactive la visibilité publique d'une annonce
 */
export const updateEquipmentStatusInSupabase = async (
  id: string,
  isPublished: boolean
): Promise<boolean> => {
  try {
    if (!isValidUUID(id)) return false;

    const { error } = await supabase
      .from('equipments')
      .update({ is_published: isPublished })
      .eq('id', id);

    if (error) {
      console.error('[Supabase equipments] Erreur mise à jour statut is_published:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase equipments] Exception updateEquipmentStatusInSupabase:', err);
    return false;
  }
};

/**
 * Supprime définitivement une annonce de la base Supabase
 */
export const deleteEquipmentFromSupabase = async (id: string): Promise<boolean> => {
  try {
    if (!isValidUUID(id)) return false;

    const { error } = await supabase
      .from('equipments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase equipments] Erreur suppression:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase equipments] Exception deleteEquipmentFromSupabase:', err);
    return false;
  }
};

/**
 * Écoute en temps réel les changements sur la table equipments (nouvelles annonces, modifications)
 */
export const subscribeToEquipments = (onChange: () => void) => {
  try {
    const channel = supabase
      .channel('public-equipments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipments' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
};
