# Home Organizer — Contexte projet

App d'organisation domestique pour deux personnes (Quentin + Laurie) : liste de courses partagée, calendrier, gestion du foyer.

## Stack

- **Web** : Next.js 14 (App Router), TypeScript, Tailwind CSS — dans `apps/web/`
- **Backend** : Firebase Auth + Firestore (pas de serveur séparé)
- **Déploiement** : Vercel → https://home.qhutch.com — serveur à Paris (`cdg1`, dans `apps/web/vercel.json`), près de la base Firestore (`europe-west9`, Paris)
- **CI** : GitHub Actions (type check + lint sur `apps/web/`)

## Démarrage local

```bash
cd apps/web
npm install
cp .env.example .env.local   # remplir avec les valeurs Firebase (demander à Quentin)
npm run dev                  # http://localhost:3000
```

## Architecture Firebase

**Auth** : l'utilisateur se connecte via Firebase Auth côté client → `getIdToken()` → POST `/api/auth/session` → cookie HttpOnly `__session` contenant l'ID token → le middleware vérifie la présence du cookie, les Server Actions vérifient le token avec `adminAuth.verifyIdToken()`.

**Firestore — collections principales** :

| Collection | Description |
|---|---|
| `households/{hid}` | Foyer (nom, createdAt) |
| `households/{hid}/members/{uid}` | Membres du foyer |
| `households/{hid}/shoppingItems/{id}` | Items de la liste de courses |
| `households/{hid}/itemMemory/{clé}` | Emoji et rayon choisis à la main pour un produit (clé = nom normalisé), remis quand on le rajoute |
| `households/{hid}/recipes/{id}` | Recettes (ingrédients, `equipment` (matériel), étapes, `category` (principale) et `categories` (toutes), `dishTypes` (types de plat, plusieurs possibles, pour les plats ; ancien champ `dishType` = un seul ; aucun des deux = deviné d'après le nom), `labels`, `seasons`, note facultative, durées, favori, lien d'origine (`sourceUrl`) ou livre de cuisine (`sourceBook`), `coverPhotoId`) |
| `households/{hid}/recipes/{id}/photos/{pid}` | Photos d'une recette (JPEG réduit < 1 Mo dans le champ `data`), servies par `/api/recipes/{id}/photos/{pid}` |
| `households/{hid}/cookings/{id}` | Historique : une recette cuisinée (« C'est prêt » du mode cuisine) — `recipeId`, `recipeTitle`, `people`, `cookedBy`, `cookedAt` |
| `households/{hid}/plannedRecipes/{recipeId}` | « À cuisiner » : recette dont on a envoyé les ingrédients aux courses — `recipeTitle`, `people`, `sentBy`, `sentAt` ; supprimé par « C'est prêt », le × ou après 14 jours |
| `households/{hid}/batchCooking/current` | Batch cooking : la semaine du foyer — `meals` (nombre de repas voulus), `recipes` (`{ recipeId, people }`, dans l'ordre), `sentAt` (courses envoyées : la page montre le compte rendu de la semaine, recettes cochées après « C'est prêt »), `updatedBy`, `updatedAt`. Page `/recipes/batch-cooking` : propose les plats qui partagent des ingrédients avec la semaine (`lib/recipes/batch.ts`, même produit via le catalogue des courses, sans sel/huile…), montre les ingrédients en commun (à préparer d'un coup), et envoie toutes les courses d'un coup (`/recipes/batch-cooking/courses`) |
| `households/{hid}/batchWeeks/{id}` | Semaines de batch cooking terminées (« Nouvelle semaine ») : `recipes` (`{ recipeId, recipeTitle, people }`), `sentAt`, `endedAt`, `endedBy` ; affichées dans l'Historique |
| `households/{hid}/recipes/{id}/stepPhotos/{pid}` | Photo d'une étape — une seule par étape, la nouvelle remplace l'ancienne (`step` = place dans `steps`, à partir de 0), ajoutée en mode cuisine, à part des photos du plat ; servies par `/api/recipes/{id}/step-photos/{pid}`. Si on permet un jour de modifier les étapes, décaler `step` en même temps |
| `households/{hid}/documents/{id}` | Documents du foyer : `name`, `mimeType`, `size`, `chunks`, `folderId` (null = à la racine), `status` (`uploading`, `ready`, `trashed` + `trashedAt`, effacé au bout de 30 jours), `sha256` (doublons), `hasThumb`, `privateTo` (uid du seul membre qui le voit ; null = tout le foyer, sauf dans un dossier privé ; sorti d'un dossier privé, il reste privé), `lastOpenedAt`, `encrypted`, `addedBy`, `createdAt`. Le fichier est rangé à part en morceaux de 3 Mo chiffrés (AES-256-GCM) par `lib/documents/storage.ts` : clé du foyer (`keyScope: 'household'`, voir `storage/keys`) ; les tout premiers essais, sans `keyScope`, directement avec `DOCUMENTS_ENCRYPTION_KEY` — la perdre = perdre les documents. Rangement : le NAS du foyer par WebDAV s'il est branché, sinon en dev le dossier local `.documents/`, servi par `/api/documents/{id}` et son aperçu par `/api/documents/{id}/thumb`. Ouvert dans Hestia à `/documents/{dossiers…}/{id}`. Devis et factures des Travaux : `paperKind` (`quote` / `invoice`), `workId`, `artisanId` ; ceux-là s'envoient et s'ouvrent **sans Face ID** (et seulement eux), depuis la fiche d'un travail ou d'un artisan, et vont dans « Maison › Devis et Factures » (créés au premier envoi, un « Maison » existant est réutilisé ; l'id du dossier dans `households/{hid}.worksFolderId`) |
| `households/{hid}/documentFolders/{id}` | Dossiers de documents : `name`, `parentId` (null = à la racine), `createdBy`, `privateTo` (uid du seul membre qui le voit, avec tout ce qu'il contient, sous-dossiers compris ; null = tout le foyer ; seul son créateur peut le rendre privé). Un dossier ou un document privé de l'autre est filtré **côté serveur** partout (`documentAccess`) : `loadLibrary(hid, uid)`, `folderAccess`, routes des fichiers, Travaux, accueil. Jamais privé : le dossier des devis et factures, ni un dossier contenant les documents ou dossiers privés de l'autre. Adresse d'un dossier : `/documents/{id}/{id}…` depuis la racine. On ne supprime qu'un dossier vide |
| `userPasskeys/{uid}/credentials/{id}` | Clés Face ID / Touch ID d'un membre (clé publique, compteur) pour déverrouiller les Documents et se connecter (page de connexion, `app/login/actions.ts` : jeton Firebase sur mesure) |
| `passkeyChallenges/{uid}` | Défi Face ID en cours (5 min, à usage unique) ; `login-{aléatoire}` pour une connexion par Face ID |
| `documentUnlocks/{sha256}` | Déverrouillage des Documents (cookie `__documents`) : `uid`, `expiresAt`, prolongé de 10 min à chaque action |
| `households/{hid}/works/{id}` | Travaux : `title`, `status` (`todo` / `doing` / `done`), `room` (pièce), `assignees` (uids), `steps` et `supplies` (matériel à acheter) = listes `{ text, done }`, `budget` (€), `notes`, `artisanId`, `interventionDate` (AAAA-MM-JJ), `quote` (montant du devis, €), `doneAt` (date de passage à « Terminé », sert à l'historique) |
| `households/{hid}/artisans/{id}` | Artisans du foyer : `name`, `trade` (métier), `phone`, `email`, `notes` ; supprimer un artisan vide `artisanId` sur ses travaux |
| `households/{hid}/calendarConnections/main` | Connexion Google Calendar |
| `households/{hid}/storage/nas` | (en local `npm run dev` : `nas-dev`, et `keys-dev` pour la clé des documents, chiffrés avec la clé du Mac, différente de celle du serveur) Le NAS du foyer, **réglé par foyer** (Réglages › NAS), pour les Photos (Synology Photos) et les Documents (WebDAV, dossier partagé `Hestia-documents`, avec la majuscule : WebDAV distingue les majuscules) : `provider` (`synology` ; Google Drive plus tard pour les foyers sans NAS), `url` (tunnel du NAS, voir `infra/nas-tunnel/`), `account`, `secret` (mot de passe + clé du gardien, chiffrés par `lib/storage/secrets.ts` avec une clé tirée de `DOCUMENTS_ENCRYPTION_KEY`). Partage des albums créés dans Hestia : `memberAccounts` (uid → id du compte Synology Photos du membre, droit « upload » ; null = « Aucun » choisi ; absent = relié tout seul par le prénom, `lib/photos/sharing.ts`) et `familyGroupId` (groupe du NAS proposé sous le nom « Famille », droit « download » ; relié tout seul au groupe « famille »). Ces albums sont créés par le compte Hestia du NAS, ses photos vont dans son espace perso (homes/Hestia). `lib/storage/nas.ts` ; photos lues par `lib/photos/`, miniatures servies par `/api/photos/thumb`, originaux par `/api/photos/original` |
| `households/{hid}/photoAlbums/{albumId}` | Albums créés dans Hestia (id = id de l'album sur le NAS, créé par le compte Hestia) : `name`, `createdBy` (uid), `sharedWithFamily`, `createdAt`. Sert au filtre « Créés par moi » et à la photo du créateur ; un album créé dans Synology Photos avec le compte d'un membre (Réglages › Albums partagés) compte aussi comme « à lui » |
| `households/{hid}/storage/keys` | `documents` : la clé de chiffrement des documents du foyer (32 octets tirés au hasard), elle-même chiffrée avec `DOCUMENTS_ENCRYPTION_KEY` |
| `households/{hid}/feedback/{id}` | Retours sur l'app (Réglages › Retours) : `text`, `createdBy`, `createdAt`, `status` (`new` / `done`), `reply` (réponse de Claude, affichée sous le retour), `doneAt` |
| `userProfiles/{uid}` | Prénom (`displayName`) et `avatarVersion` (change à chaque nouvelle photo de profil) |
| `userAvatars/{uid}` | Photo de profil (JPEG 400 px dans `data`), servie par `/api/avatars/{uid}?v=…` aux membres du même foyer |
| `userHouseholds/{uid}` | Doc dénormalisé : `{ householdId, role }` — pour lookup rapide |
| `invites/{token}` | Invitations (top-level, pas subcollection) |

## Retours (à traiter en premier)

Au début de chaque session, le hook `SessionStart` (`.claude/settings.json`) lance `node apps/web/scripts/feedback.mjs`, qui affiche les retours en attente laissés dans Réglages › Retours.
S'il y en a : **commencer par eux**, avant la demande du jour (les présenter, proposer quoi faire). Une fois un retour traité :
`node apps/web/scripts/feedback.mjs done households/<hid>/feedback/<id> "réponse courte"` — la réponse s'affiche sous le retour dans l'app.

## Fichiers clés

```
apps/web/src/
  lib/firebase/
    client.ts       — Firebase client SDK (auth côté navigateur)
    admin.ts        — Firebase Admin SDK (server-side)
    session.ts      — getSessionUser(), getUserHousehold()
  app/
    api/auth/session/route.ts   — POST/DELETE cookie __session
    api/calendar/callback/      — OAuth callback Google Calendar
    (app)/                      — Pages protégées
      actions.ts                — Server Actions liste de courses
      setup/actions.ts          — Créer un foyer
      settings/                 — Réglages : profil, membres, invitations, agenda
      calendar/                 — Intégration Google Calendar
  proxy.ts          — Middleware : redirige /login si pas de cookie
```

## Design system

Avant de créer ou modifier un écran, lire `apps/web/DESIGN.md` (couleurs, typo, composants, règles).
Utiliser les utilitaires (`tile`, `card`, `btn`, `btn-outline`, `btn-feature`, `btn-feature-outline`, `btn-danger`, `btn-lg`, `icon-btn`, `icon-btn-fill`, `pill`, `chip`, `field`, `eyebrow`),
`PageHero` et `FEATURES` plutôt que des classes Tailwind à la main, et garder la cohérence partout :
un changement de style s'applique à toutes les pages concernées.

## Pattern à respecter

- Toutes les **mutations** passent par des **Server Actions** Next.js avec `firebase-admin` — pas d'appels Firestore côté client.
- Les Server Actions récupèrent `householdId` elles-mêmes via `getSessionUser()` + `getUserHousehold()` — ne pas le passer en paramètre depuis le composant.
- Types en camelCase dans `src/types/database.ts` (`inList`, `addedBy`, `createdAt`, etc.).

## CI

Le workflow `.github/workflows/ci-web.yml` tourne sur chaque push/PR qui touche `apps/web/`. Il fait :
1. `npx tsc --noEmit` (avec des env vars placeholder)
2. `npm run lint`

Pas besoin de secrets GitHub pour la CI — Vercel déploie automatiquement via son intégration GitHub.

## Variables d'environnement

Voir `apps/web/.env.example` pour la liste complète. Les valeurs réelles sont dans Vercel (settings → Environment Variables) et dans `.env.local` localement (non commité).
