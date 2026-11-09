import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'

// Sert une photo de recette du foyer. Une photo ne change jamais : le navigateur la garde en cache.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })

  const { id, photoId } = await params
  const doc = await db
    .collection('households').doc(membership.householdId)
    .collection('recipes').doc(id)
    .collection('photos').doc(photoId)
    .get()
  const data = doc.data()?.data as Buffer | undefined
  if (!data) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
