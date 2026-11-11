import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { documentsUnlocked } from '@/lib/documents/unlock'
import { chunkKey, documentStorage } from '@/lib/documents/storage'
import { documentAccess, isPaperKind } from '@/lib/documents/library'

// Aperçu d'un document (JPEG), aussi protégé que le document : Face ID récent obligatoire,
// sauf pour un devis ou une facture des Travaux
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })

  const { id } = await params
  const storage = documentStorage()
  const doc = (await db.collection('households').doc(membership.householdId).collection('documents').doc(id).get()).data()
  if (!isPaperKind(doc?.paperKind) && !(await documentsUnlocked(user.uid))) return new Response(null, { status: 403 })
  if (!storage || !doc?.hasThumb) return new Response(null, { status: 404 })
  if (!(await documentAccess(membership.householdId, user.uid))(doc)) return new Response(null, { status: 404 })

  const data = await storage.get(chunkKey(membership.householdId, id, 'thumb'), Boolean(doc.encrypted))
  return new Response(new Uint8Array(data), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
