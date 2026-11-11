import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase/admin'

// Déverrouillage des documents par Face ID : un jeton aléatoire dans un cookie HttpOnly,
// dont l'empreinte (SHA-256) est gardée dans documentUnlocks/{empreinte} avec son membre et son expiration.
// Il reste ouvert UNLOCK_MINUTES après la dernière action, puis il faut refaire Face ID.
const UNLOCK_COOKIE = '__documents'
export const UNLOCK_MINUTES = 10
const UNLOCK_MS = UNLOCK_MINUTES * 60 * 1000

function unlockRef(token: string) {
  return db.collection('documentUnlocks').doc(createHash('sha256').update(token).digest('hex'))
}

// À appeler seulement depuis une Server Action ou une route (on y écrit un cookie)
export async function unlockDocuments(uid: string) {
  const token = randomBytes(32).toString('base64url')
  await unlockRef(token).set({ uid, expiresAt: new Date(Date.now() + UNLOCK_MS) })
  const cookieStore = await cookies()
  cookieStore.set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 60 * 60,
  })
}

// Pour les tests sur le Mac seulement (npm run dev, DOCUMENTS_SKIP_FACE_ID=1 dans .env.local) : pas de Face ID.
// Jamais en ligne : Vercel lance toujours Hestia en « production ».
export const SKIP_FACE_ID = process.env.NODE_ENV === 'development' && process.env.DOCUMENTS_SKIP_FACE_ID === '1'

// Vrai si ce membre a déverrouillé récemment ; prolonge alors le déverrouillage.
export async function documentsUnlocked(uid: string) {
  if (SKIP_FACE_ID) return true
  const cookieStore = await cookies()
  const token = cookieStore.get(UNLOCK_COOKIE)?.value
  if (!token) return false
  const ref = unlockRef(token)
  const data = (await ref.get()).data()
  if (!data || data.uid !== uid) return false
  if (data.expiresAt.toDate().getTime() < Date.now()) {
    await ref.delete()
    return false
  }
  await ref.update({ expiresAt: new Date(Date.now() + UNLOCK_MS) })
  return true
}

// À appeler seulement depuis une Server Action ou une route
export async function lockDocuments() {
  const cookieStore = await cookies()
  const token = cookieStore.get(UNLOCK_COOKIE)?.value
  if (token) await unlockRef(token).delete()
  cookieStore.delete(UNLOCK_COOKIE)
}
