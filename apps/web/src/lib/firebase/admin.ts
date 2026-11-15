import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

// En dev, la base est l'émulateur sur le Mac (npm run dev, scripts/dev-db.mjs) : pas la vraie, dont le quota est limité
if (process.env.NODE_ENV === 'development' && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.warn('⚠️  Hestia en dev sur la VRAIE base Firestore (npm run dev:real-db) : chaque rechargement consomme son quota.')
}

export const adminAuth = getAuth()
export const db = getFirestore()
