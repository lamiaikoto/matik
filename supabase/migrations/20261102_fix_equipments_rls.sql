-- ============================================================
-- Migration : Correction des politiques RLS pour la table equipments
-- Problème : Les annonces déposées par un utilisateur authentifié
--            disparaissent lors de la déconnexion car :
--            1. INSERT est bloqué pour les utilisateurs authentifiés (aucune policy d'écriture)
--            2. SELECT public ne filtre pas correctement sur is_published
-- ============================================================

-- Activer RLS sur la table equipments (au cas où elle n'est pas encore activée)
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

-- Nettoyer les anciennes politiques existantes pour repartir proprement
DROP POLICY IF EXISTS "Allow public read of published equipments" ON public.equipments;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.equipments;
DROP POLICY IF EXISTS "Allow owner update" ON public.equipments;
DROP POLICY IF EXISTS "Allow owner delete" ON public.equipments;
DROP POLICY IF EXISTS "Equipment visible to everyone" ON public.equipments;
DROP POLICY IF EXISTS "Owners can manage their equipment" ON public.equipments;

-- ============================================================
-- 1. LECTURE PUBLIQUE : tout visiteur (connecté ou non) peut voir 
--    les annonces publiées (is_published = true)
-- ============================================================
CREATE POLICY "Allow public read of published equipments"
  ON public.equipments
  FOR SELECT
  USING (is_published = true);

-- ============================================================
-- 2. LECTURE PROPRIÉTAIRE : un utilisateur connecté peut voir 
--    TOUTES ses propres annonces (publiées ou brouillons)
-- ============================================================
CREATE POLICY "Allow owner read all own equipments"
  ON public.equipments
  FOR SELECT
  USING (auth.uid() = owner_id);

-- ============================================================
-- 3. INSERTION : tout utilisateur authentifié peut créer une annonce
--    en son propre nom (owner_id doit correspondre à auth.uid())
-- ============================================================
CREATE POLICY "Allow authenticated insert"
  ON public.equipments
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================
-- 4. MISE À JOUR : seul le propriétaire peut modifier son annonce
-- ============================================================
CREATE POLICY "Allow owner update"
  ON public.equipments
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================
-- 5. SUPPRESSION : seul le propriétaire peut supprimer son annonce
-- ============================================================
CREATE POLICY "Allow owner delete"
  ON public.equipments
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- 6. S'assurer que le DEFAULT de is_published est TRUE
--    pour que chaque nouvelle annonce soit visible sans action manuelle
-- ============================================================
ALTER TABLE public.equipments
  ALTER COLUMN is_published SET DEFAULT true;

-- Correction des lignes existantes dont is_published est NULL
UPDATE public.equipments
  SET is_published = true
  WHERE is_published IS NULL;

-- ============================================================
-- Vérification finale (optionnelle, à exécuter dans le SQL editor)
-- SELECT id, title, is_published, owner_id FROM public.equipments LIMIT 10;
-- ============================================================
