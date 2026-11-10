import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { documentsUnlocked } from '@/lib/documents/unlock'
import { chunkKey, documentStorage } from '@/lib/documents/storage'

// Aperçu d'un document (JPEG), aussi protégé que le document : Face ID récent obligatoire
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })
  if (!(await documentsUnlocked(user.uid))) return new Response(null, { status: 403 })

  const { id } = await params
  const storage = documentStorage()
  const doc = (await db.collection('households').doc(membership.householdId).collection('documents').doc(id).get()).data()
  if (!storage || !doc?.hasThumb) return new Response(null, { status: 404 })

  const data = await storage.get(chunkKey(membership.householdId, id, 'thumb'), Boolean(doc.encrypted))
  return new Response(new Uint8Array(data), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
