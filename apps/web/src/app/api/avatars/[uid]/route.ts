import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'

// Sert la photo de profil d'un membre du foyer. L'adresse change à chaque nouvelle photo (?v=…) :
// le navigateur peut la garder en cache.
export async function GET(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })

  const { uid } = await params
  // Seulement les photos des membres de mon foyer
  const member = await db.collection('households').doc(membership.householdId).collection('members').doc(uid).get()
  if (!member.exists) return new Response(null, { status: 404 })

  const doc = await db.collection('userAvatars').doc(uid).get()
  const data = doc.data()?.data as Buffer | undefined
  if (!data) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
