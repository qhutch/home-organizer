import { cookies } from 'next/headers'
import { adminAuth, db } from './admin'

const SESSION_COOKIE = '__session'

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded
  } catch {
    return null
  }
}

export async function getUserHousehold(uid: string) {
  const doc = await db.collection('userHouseholds').doc(uid).get()
  if (!doc.exists) return null
  return doc.data() as { householdId: string; role: 'owner' | 'member' }
}
