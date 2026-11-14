import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getNasConnection } from '@/lib/storage/nas'
import { ALBUM_REF, downloadOriginal } from '@/lib/photos/synology'

// Types que le navigateur peut afficher sans risque ; le reste est seulement téléchargé
const SHOWN = /^(image\/(jpeg|png|gif|webp|heic|heif)|video\/(mp4|quicktime))$/

// Photo originale d'un album du NAS du foyer : /api/photos/original?a=<album>&i=<id>[&download=1]
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })

  const params = new URL(request.url).searchParams
  const album = params.get('a') ?? ''
  const id = Number(params.get('i'))
  if (!ALBUM_REF.test(album) || !Number.isInteger(id) || id <= 0) return new Response(null, { status: 400 })

  const connection = await getNasConnection(membership.householdId)
  if (!connection) return new Response(null, { status: 404 })

  try {
    const file = await downloadOriginal(connection, album, id)
    const shown = SHOWN.test(file.type) && !params.has('download')
    const headers: Record<string, string> = {
      'Content-Type': shown ? file.type : 'application/octet-stream',
      'Content-Disposition': `${shown ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    }
    if (file.size) headers['Content-Length'] = file.size
    return new Response(file.body, { headers })
  } catch {
    return new Response(null, { status: 502 })
  }
}
