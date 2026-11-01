# Home Organizer

Monorepo — Web (Next.js), iOS (SwiftUI), Android (Compose), Firebase backend.

## Structure

```
apps/
  web/       → Next.js app (home.qhutch.com)
  ios/       → SwiftUI app
  android/   → Jetpack Compose app
firebase/
  firestore.rules
```

## Web

```bash
cd apps/web
npm install
cp .env.example .env.local   # remplir les valeurs
npm run dev
```

Voir [apps/web/.env.example](apps/web/.env.example) pour les variables requises.
