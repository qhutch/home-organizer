import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getNasConnection } from '@/lib/storage/nas'
import { ALBUM_REF, downloadAlbum, listAlbums } from '@/lib/photos/synology'

// Un gros album met du temps à passer du NAS au téléphone
export const maxDuration = 300

// Tout un album en zip, préparé par le NAS : /api/photos/album?a=<album>
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })

  const album = new URL(request.url).searchParams.get('a') ?? ''
  if (!ALBUM_REF.test(album)) return new Response(null, { status: 400 })
  const connection = await getNasConnection(membership.householdId)
  if (!connection) return new Response(null, { status: 404 })

  try {
    // Le nom du fichier : celui de l'album (liste gardée un moment par le serveur, pas un appel de plus au NAS)
    const name = (await listAlbums(connection)).find(a => a.ref === album)?.name ?? 'album'
    const body = await downloadAlbum(connection, album)
    return new Response(body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${name}.zip`)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 502 })
  }
}
