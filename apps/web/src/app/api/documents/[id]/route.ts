import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { documentsUnlocked } from '@/lib/documents/unlock'
import { chunkKey, documentStorage } from '@/lib/documents/storage'
import { documentAccess, isPaperKind } from '@/lib/documents/library'

// Types que le navigateur peut afficher sans risque ; les autres sont seulement téléchargés
// (une page HTML ouverte ici pourrait agir dans Hestia à la place du membre).
const SHOWN = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'text/plain'])

// Sert un document du foyer, morceau par morceau, à un membre qui a fait Face ID il y a peu
// (pas besoin de Face ID pour un devis ou une facture des Travaux).
// ?download=1 : le télécharger plutôt que l'ouvrir.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })

  const { id } = await params
  const storage = documentStorage()
  const doc = (await db.collection('households').doc(membership.householdId).collection('documents').doc(id).get()).data()
  // Les devis et factures des Travaux s'ouvrent sans Face ID ; les autres documents, non
  if (!isPaperKind(doc?.paperKind) && !(await documentsUnlocked(user.uid))) return Response.redirect(new URL('/documents', request.url), 303)
  if (!storage || !doc || doc.status !== 'ready') return new Response(null, { status: 404 })
  // Privé pour un autre membre (ou dans un de ses dossiers privés) : comme s'il n'existait pas
  if (!(await documentAccess(membership.householdId, user.uid))(doc)) return new Response(null, { status: 404 })

  const householdId = membership.householdId
  const chunks = doc.chunks as number
  const encrypted = Boolean(doc.encrypted)
  let next = 0
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (next >= chunks) return controller.close()
      controller.enqueue(new Uint8Array(await storage.get(chunkKey(householdId, id, next++), encrypted)))
    },
  })

  const shown = SHOWN.has(doc.mimeType) && !new URL(request.url).searchParams.has('download')
  const name = encodeURIComponent(doc.name as string)
  return new Response(body, {
    headers: {
      'Content-Type': shown ? doc.mimeType : 'application/octet-stream',
      'Content-Length': String(doc.size),
      'Content-Disposition': `${shown ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
