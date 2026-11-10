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
| `households/{hid}/recipes/{id}` | Recettes (ingrédients, `equipment` (matériel), étapes, catégorie, `dishType` (type de plat, pour les plats ; absent = deviné d'après le nom), `labels`, `seasons`, note facultative, durées, favori, lien d'origine (`sourceUrl`) ou livre de cuisine (`sourceBook`), `coverPhotoId`) |
| `households/{hid}/recipes/{id}/photos/{pid}` | Photos d'une recette (JPEG réduit < 1 Mo dans le champ `data`), servies par `/api/recipes/{id}/photos/{pid}` |
| `households/{hid}/cookings/{id}` | Historique : une recette cuisinée (« C'est prêt » du mode cuisine) — `recipeId`, `recipeTitle`, `people`, `cookedBy`, `cookedAt` |
| `households/{hid}/recipes/{id}/stepPhotos/{pid}` | Photo d'une étape — une seule par étape, la nouvelle remplace l'ancienne (`step` = place dans `steps`, à partir de 0), ajoutée en mode cuisine, à part des photos du plat ; servies par `/api/recipes/{id}/step-photos/{pid}`. Si on permet un jour de modifier les étapes, décaler `step` en même temps |
| `households/{hid}/calendarConnections/main` | Connexion Google Calendar |
| `userProfiles/{uid}` | Prénom (`displayName`) et `avatarVersion` (change à chaque nouvelle photo de profil) |
| `userAvatars/{uid}` | Photo de profil (JPEG 400 px dans `data`), servie par `/api/avatars/{uid}?v=…` aux membres du même foyer |
| `userHouseholds/{uid}` | Doc dénormalisé : `{ householdId, role }` — pour lookup rapide |
| `invites/{token}` | Invitations (top-level, pas subcollection) |

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
