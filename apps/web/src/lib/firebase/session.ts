import { cookies } from 'next/headers'
import { adminAuth, db } from './admin'

const SESSION_COOKIE = '__session'

// Cookie __session : cookie de session Firebase (2 semaines, posé par /api/auth/session).
// Les anciens cookies contenaient directement l'ID token (1 heure) : encore acceptés jusqu'à expiration.
export async function verifySession(cookie: string) {
  try {
    return await adminAuth.verifySessionCookie(cookie)
  } catch {
    try {
      return await adminAuth.verifyIdToken(cookie)
    } catch {
      return null
    }
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function getUserHousehold(uid: string) {
  const doc = await db.collection('userHouseholds').doc(uid).get()
  if (!doc.exists) return null
  return doc.data() as { householdId: string; role: 'owner' | 'member' }
}
