import { getNasConnection } from '@/lib/storage/nas'
import { ALBUM_REF, getThumbnail, type ThumbSize } from '@/lib/photos/synology'
import { checkThumbLink } from '@/lib/photos/thumb-link'

const SIZES = new Set<ThumbSize>(['sm', 'm', 'xl'])

// Miniature d'une photo du NAS d'un foyer, par lien signé (lib/photos/thumb-link.ts) :
// /api/photos/thumb?f=<foyer>&a=<album>&i=<id>&k=<cache_key>&s=<sm|m|xl>&t=<signature>
// Le cache_key change quand la photo change : la miniature peut être gardée un an, par le navigateur et par Vercel.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const household = params.get('f') ?? ''
  const album = params.get('a') ?? ''
  const id = Number(params.get('i'))
  const key = params.get('k') ?? ''
  const size = (params.get('s') ?? 'm') as ThumbSize
  if (!/^[\w-]{1,64}$/.test(household) || !ALBUM_REF.test(album) || !Number.isInteger(id) || id <= 0
    || !/^[\w-]{1,64}$/.test(key) || !SIZES.has(size)) {
    return new Response(null, { status: 400 })
  }
  if (!checkThumbLink(household, album, id, key, size, params.get('t') ?? '')) return new Response(null, { status: 403 })

  const connection = await getNasConnection(household)
  if (!connection) return new Response(null, { status: 404 })

  try {
    const { data, type } = await getThumbnail(connection, album, id, key, size)
    return new Response(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    // Pas de cache pour un refus : on réessaiera
    return new Response(null, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
