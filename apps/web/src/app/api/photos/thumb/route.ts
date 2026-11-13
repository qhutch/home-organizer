import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getNasConnection } from '@/lib/storage/nas'
import { ALBUM_REF, getThumbnail, type ThumbSize } from '@/lib/photos/synology'

const SIZES = new Set<ThumbSize>(['sm', 'm', 'xl'])

// Miniature d'une photo du NAS du foyer : /api/photos/thumb?a=<album>&i=<id>&k=<cache_key>&s=<sm|m|xl>
// Le cache_key change quand la photo change : le navigateur peut garder l'image longtemps.
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  const membership = await getUserHousehold(user.uid)
  if (!membership) return new Response(null, { status: 403 })

  const params = new URL(request.url).searchParams
  const album = params.get('a') ?? ''
  const id = Number(params.get('i'))
  const key = params.get('k') ?? ''
  const size = (params.get('s') ?? 'm') as ThumbSize
  if (!ALBUM_REF.test(album) || !Number.isInteger(id) || id <= 0 || !/^[\w-]{1,64}$/.test(key) || !SIZES.has(size)) {
    return new Response(null, { status: 400 })
  }

  const connection = await getNasConnection(membership.householdId)
  if (!connection) return new Response(null, { status: 404 })

  try {
    const { data, type } = await getThumbnail(connection, album, id, key, size)
    return new Response(data, {
      headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=604800, immutable', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch {
    return new Response(null, { status: 502 })
  }
}
