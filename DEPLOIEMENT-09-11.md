# Déploiement des migrations 09 → 11 et du lot de corrections (F1, F2, F3, F4, F5, F12 + états des lieux vidéo + limite 2 photos)

> Stack conservée : **React / Vite + Supabase + Vercel**. RLS existantes conservées, design existant conservé, aucune donnée de démonstration fictive ajoutée.
>
> Ordre de mise en production conseillé : **(A) Migrations Supabase** → **(B) Variables Vercel** → **(C) Push Git + Redeploy** → **(D) Recettes de vérification**.

---

## 0. Récapitulatif des changements

### 0.1 Base de données (nouvelles migrations à exécuter dans Supabase SQL Editor)

| Fichier | Objet |
|---|---|
| `supabase/migrations/09_booking_integrity_and_overlap.sql` | **F1** : suppression de l'INSERT RLS client, `REVOKE INSERT` sur `bookings`, trigger `guard_booking_insert` (statut forcé `pending_payment`, paiements vidés, montants/caution recalculés depuis `equipments`). **F2** : extension `btree_gist`, contrainte d'exclusion `bookings_no_overlap_active` (plages `[)` sur statuts actifs). |
| `supabase/migrations/10_equipment_two_photos.sql` | Colonne `images jsonb` (0 à 2 éléments, `CHECK <= 2`) pour la galerie courte des annonces. |
| `supabase/migrations/11_inspection_video_hardening.sql` | **F5** : bucket `inspection-videos` plafonné à **50 Mo**, uploads rangés par préfixe `<uid>/` ou `anon/`. Workflow vidéo : colonne `replaced_at`, trigger `guard_video_inspection_update` (vérou post-validation), retrait de `UPDATE` direct client, RPC `get_video_inspection` enrichie. |

### 0.2 API (serverless Vercel)

| Fichier | Correction |
|---|---|
| `api/booking.ts` | **F2** : vérification anti-chevauchement (409) avant création. **F4** : échec franc en production si `STRIPE_SECRET_KEY` absente (session paiement **et** libération de caution) — plus aucun succès simulé en production. |
| `api/lib/bookingSecurity.ts` | `assertNoOverlappingBooking()` (statuts actifs, chevauchement semi-ouvert), `isProduction()`, liste des statuts bloquants. |
| `api/stripe/connect.ts` | **F3** : CORS aligné sur la liste d'origines autorisées (plus de `Origin: *` + `credentials: true`), parsing JSON sécurisé (400). |
| `api/lib/inspections.ts` + `api/inspections/delete.ts` + `api/inspections/replace.ts` | Suppression (ligne + fichier Storage) par créateur **ou** détenteur du lien client ; remplacement refusé 409 après validation client, ancienne vidéo supprimée lors d'un remplacement. |
| `api/cron/renew-cautions.ts` | **F12** : Cron interne sans en-tête CRS navigateur ; garde Bearer `CRON_SECRET` conservée (503 si secret absent). |
| `vercel.json` | Mémoire/durée maximale des nouvelles routes API ; crons déclarés inchangés. |

### 0.3 Client

| Fichier | Changement |
|---|---|
| `src/lib/bookingService.ts` | **F1** : `insertBookingRecord()` désactivé (plus d'insertion directe) ; la liste est rafraîchie après succès API. |
| `src/App.tsx` | Plus d'écriture client des champs de paiement/Stripe (webhook service_role seul) ; rafraîchissement de la liste après retour Stripe. |
| `src/lib/equipmentService.ts` | Lecture/écriture de `images` (2 max), repli automatique si la colonne n'existe pas encore. |
| `src/types.ts` | `Equipment.photos?: string[]`. |
| `src/components/EquipmentEditorModal.tsx` | **Limite stricte 2 photos** : compteur « n / 2 — 2 photos maximum », deux slots (principale / secondaire), remplacer/retirer, ajout masqué/désactivé à 2, label explicite. |
| `src/components/EquipmentDetails.tsx` | Affichage d'une vue complémentaire éventuelle (jamais plus de 2). |
| `src/lib/videoInspectionService.ts` | Chemins `uid/` ou `anon/`, `deleteInspection()`, `replaceInspectionVideo()`, champ `replaced_at`. |
| `src/components/VideoInspectionStudio.tsx` | Prévisualisation, **Recommencer la prise** avant publication, mode remplacement avant validation, verrou visuel si la vidéo est validée. |
| `src/components/VideoInspectionPage.tsx` | Actions par ligne : **Refaire** (avant validation uniquement), **Supprimer** (tous états, avec confirmation), bannière de refaite en cours. |
| `src/components/VideoInspectionSharePage.tsx` | Suppression avec confirmation (créateur **et** client), panneau « supprimé », mention « preuve verrouillée, suppression seule possible » après validation. |

---

## A. Supabase — exécution des migrations (dans l'ordre)

1. Connexion au projet Supabase → **SQL Editor** → **New query**.
2. Coller et exécuter **dans cet ordre** (un fichier par onglet/requête, ou un fichier à la fois) :
   1. `supabase/migrations/09_booking_integrity_and_overlap.sql`
   2. `supabase/migrations/10_equipment_two_photos.sql`
   3. `supabase/migrations/11_inspection_video_hardening.sql`

### A.1 Diagnostic à lancer AVANT la migration 09 (chevauchements historiques)

La contrainte d'exclusion échouerait (`23P01`) si deux réservations actives se chevauchent déjà. Exécuter d'abord :

```sql
with active as (
  select id, equipment_id, status, start_date, end_date
    from public.bookings
   where status in ('en_attente_remise','en_cours','restitution_signalee')
     and equipment_id is not null
)
select a.id as booking_a, b.id as booking_b, a.equipment_id
  from active a
  join active b on a.equipment_id = b.equipment_id
               and a.id < b.id
               and a.start_date < b.end_date
               and b.start_date < a.end_date;
```

- Résultat vide → exécuter la migration 09 directement.
- Résultat non vide → annuler/rectifier les lignes concernées (uniquement celles `payment_confirmed_at is null`), puis relancer la migration 09.

### A.2 Vérifications post-migrations (SQL Editor)

```sql
-- 1. Trigger et contraintes F1/F2
select tgname from pg_trigger where tgname = 'bookings_guard_insert';
select conname, contype from pg_constraint where conname = 'bookings_no_overlap_active';

-- 2. Colonne photos (10)
select column_name, data_type from information_schema.columns
 where table_name = 'equipments' and column_name = 'images';

-- 3. Bucket F5 : taille max 52 428 800 octets (50 Mo)
select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'inspection-videos';

-- 4. Verrou vidéo (11)
select tgname from pg_trigger where tgname = 'video_inspections_guard_update';
```

### A.3 Vérification Storage → Policies

Bucket `inspection-videos` :
- **read** : public (lecture du lien non listé) — inchangé.
- **upload (authenticated)** : condition `bucket_id='inspection-videos' AND (storage.foldername(name))[1] = auth.uid()::text`.
- **upload (anon)** : condition `bucket_id='inspection-videos' AND (storage.foldername(name))[1] = 'anon'`.
- **delete (authenticated)** : propriétaire du fichier ; les suppressions de créateurs anonymes passent par l'API `service_role`.

---

## B. Vercel — variables d'environnement (Project → Settings → Environment Variables, environnement **Production**)

| Variable | Utilisation | Présence requise |
|---|---|---|
| `SUPABASE_URL` | API admin | Déjà en place |
| `SUPABASE_SERVICE_ROLE_KEY` | Écriture serverless (réservations, inspections, Storage) | Déjà en place |
| `STRIPE_SECRET_KEY` | Sessions paiement + caution Connect | **Obligatoire en production** (F4 : sans elle, l'API échoue franchement au lieu de simuler) |
| `STRIPE_WEBHOOK_SECRET` | Vérification signature webhook | Déjà en place |
| `CRON_SECRET` | **F12** : secret Bearer envoyé par Vercel Cron vers `/api/cron/renew-cautions` | À définir si absent (chaîne longue aléatoire, ex. `openssl rand -hex 32`) |
| `APP_URL` / `ALLOWED_ORIGINS` | **F3** : origines CORS autorisées (production uniquement, ex. `https://matikilou.com,https://www.matikilou.com`) | Vérifier la liste |

**F12 — activation du cron :**
1. Variables → ajouter/confirmer `CRON_SECRET` en **Production** (et Preview si nécessaire).
2. **Deployments → ⋯ du dernier déploiement → Redeploy** (les variables d'env sont lues au build/runtime ; un redeploy est nécessaire après modification).
3. Vercel → **Cron Jobs** : vérifier `/api/cron/renew-cautions` (schedule `0 3 * * *`). Exécutions récentes en `200` ; une exécution sans `CRON_SECRET` répond `503`.

---

## C. Commandes Git exactes

Depuis la racine du dépôt local (`matik-repo` / dossier du projet) :

```bash
# 1. État de la zone de travail (lister les modifications attendues)
git status

# 2. Ajouter tous les fichiers du lot (modifiés + créations)
git add supabase/migrations/09_booking_integrity_and_overlap.sql \
        supabase/migrations/10_equipment_two_photos.sql \
        supabase/migrations/11_inspection_video_hardening.sql \
        api/booking.ts \
        api/lib/bookingSecurity.ts \
        api/lib/inspections.ts \
        api/inspections/delete.ts \
        api/inspections/replace.ts \
        api/stripe/connect.ts \
        api/cron/renew-cautions.ts \
        vercel.json \
        src/App.tsx \
        src/types.ts \
        src/lib/bookingService.ts \
        src/lib/equipmentService.ts \
        src/lib/videoInspectionService.ts \
        src/components/EquipmentEditorModal.tsx \
        src/components/EquipmentDetails.tsx \
        src/components/VideoInspectionStudio.tsx \
        src/components/VideoInspectionPage.tsx \
        src/components/VideoInspectionSharePage.tsx \
        DEPLOIEMENT-09-11.md

# 3. Vérifier ce qui sera commité
git status
git diff --cached --stat

# 4. Commit
git commit -m "feat(securite): reservations verrouillees, anti-chevauchement, Stripe fail-closed, bucket video durci, workflow etat des lieux, 2 photos max par annonce"

# 5. Push sur la branche principale
git push origin main
```

> Si l'agent/l'utilisateur souhaite un commit plus granulaire, il est aussi possible de séparer : `commit 1` migrations + API sécurité, `commit 2` workflow vidéo, `commit 3` limite photos. Le push reste identique.

Vercel déploie automatiquement depuis `main` (au premier déploiement après push). Vérifier le build dans **Deployments** : statut **Ready** ; aucun `Build Error`.

---

## D. Recettes de vérification sur le site en ligne

### D.1 F1 — intégrité des réservations (création serveur seule)

1. Se connecter, ouvrir une annonce, choisir des dates valides, valider le formulaire.
2. Réseau (DevTools → Network) : la création passe par `POST /api/booking` ; **aucune** requête `POST /rest/v1/bookings` ne part du navigateur.
3. Table `bookings` (Supabase → Table Editor) : ligne créée avec `status = pending_payment`, champs `payment_confirmed_at` / `stripe_*` vides, montants cohérents avec `equipments.price_per_day`.
4. Tentative manuelle (SQL anonyme / client) d'insertion directe → refus (42501 / politique absente).

### D.2 F2 — anti-chevauchement

1. Réserver un bien sur des dates où une réservation active (`en_attente_remise` / `en_cours` / `restitution_signalee`) existe → réponse **409**, message « déjà réservé sur tout ou partie de ces dates ».
2. Enchaînement autorisé : réservation se terminant le jour J et nouvelle commençant le jour J → acceptée (plage semi-ouverte `[)`).
3. Deux paiements simultanés sur les mêmes dates : la contrainte base (ou l'API 409) bloque la seconde ligne.

### D.3 F3 — CORS Stripe Connect

1. `OPTIONS /api/stripe/connect` depuis une origine listée (`APP_URL` / `ALLOWED_ORIGINS`) → `Access-Control-Allow-Origin` = cette origine + credentials.
2. Origine non listée → en-tête CORS absent (pas de `*` avec credentials).
3. Corps JSON malformé → `400` (au lieu de `500`).

### D.4 F4 — Stripe fail-closed en production

1. En production, variable `STRIPE_SECRET_KEY` absente/invalide : le parcours de paiement renvoie une erreur de configuration (pas de badge « simulation »), la caution ne peut pas être marquée libérée (`503`).
2. En local (`NODE_ENV !== production`), le mode de test UI reste disponible sans clé (développement uniquement).

### D.5 F5 — bucket `inspection-videos`

1. Upload vidéo > 50 Mo → rejeté par Storage (quota 52 428 800 octets).
2. Types MIME refusés (`video/mp4`, `video/webm`, `video/quicktime` uniquement).
3. Chemins : compte connecté → `<auth.uid()>/…` ; mode rapide → `anon/…` ; aucun upload arbitraire hors préfixe.

### D.6 Workflow état des lieux vidéo

**Avant publication (studio) :**
1. Filmer → arrêter → **prévisualisation** dans le lecteur.
2. Bouton **Recommencer la prise** → la séquence est supprimée, la caméra relancée ; la vidéo peut être repuisée avant envoi.
3. **Valider et générer le lien client** crée la ligne et le lien privé.

**Avant validation client :**
4. Liste « Mes états des lieux » → **Refaire** : nouveau recording → **Remplacer la vidéo avant validation client** ; l'ancienne vidéo disparaît du Storage ; ligne mise à jour (`replaced_at`).
5. **Supprimer** (créateur) → confirmation → ligne + fichier supprimés.

**Après validation client (`validé client · verrouillé`) :**
6. Plus de bouton **Refaire** ; studio en mode remplacement affiche le bandeau **Preuve validée par le client — verrouillée**.
7. Tentative d'API de remplacement sur une ligne validée → `409 INSPECTION_VALIDATED_LOCKED`.
8. Suppression toujours possible (créateur depuis la liste **ou** client depuis la page de partage) avec confirmation ; panneau « État des lieux supprimé ».
9. Page de partage : bouton de validation client horodaté ; après validation, mention explicite que la preuve ne peut plus être modifiée.

### D.7 Limite de 2 photos par annonce

1. Modifier/créer une annonce → onglet **Photos de l'annonce** : compteur `n / 2 — 2 photos maximum`.
2. Renseigner 2 photos (téléversement, bibliothèque HD ou URL) : le bouton d'ajout est désactivé/masqué.
3. **Remplacer** une photo existante et **Retirer** une photo restent possibles dans la limite de 2.
4. Enregistrement : table `equipments.images` contient 0, 1 ou 2 URL ; `image_url` = photo principale ; la fiche affiche la vue complémentaire si elle existe.
5. Aucune photo tierce n'est persistée hors de cette limite.

### D.8 F12 — Cron

1. Vercel → Cron Jobs → dernier run en `200` ; logs sans « missing CRON_SECRET ».
2. Appel manuel `GET /api/cron/renew-cautions` sans en-tête → `503` ; avec `Authorization: Bearer <CRON_SECRET>` → `200`.

---

## E. Notes techniques et retour arrière (rollback)

- **Repli compatible** : `equipmentService` continue de fonctionner si la migration 10 n'est pas appliquée (galerie alors stockée en métadonnées de description) ; la limite UX de 2 s'applique dans tous les cas.
- **Trigger bookings** : les écritures légitimes de workflow (statuts locataire/loueur via politiques UPDATE existantes, migrations 04) ne sont pas touchées ; seul l'INSERT direct est fermé.
- **Rollback partiel (urgence)** :
  - API : reverter le commit ; Vercel redéploie la version précédente.
  - Base : ne pas supprimer les colonnes/constraintes sans sauvegarde ; en cas de conflit sur l'exclusion, désactiver la contrainte :
    ```sql
    alter table public.bookings drop constraint if exists bookings_no_overlap_active;
    ```
    (à réserver à une situation de blocage de production, et corriger les données avant réactivation.)
- **Build local de vérification** :
  ```bash
  npx tsc --noEmit
  npm run build
  ```
  Les deux doivent passer sans erreur avant le push.
