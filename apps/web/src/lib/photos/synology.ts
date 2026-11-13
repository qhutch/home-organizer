import type { NasConnection as SynologyConnection } from '@/lib/storage/nas'

// Client Synology Photos, côté serveur seulement.
// L'API n'est pas documentée officiellement (repères : github.com/zeichensatz/SynologyPhotosAPI) :
// on reste sur les appels les plus simples, en POST (le mot de passe ne passe jamais dans une adresse),
// et chaque appel montre la clé du gardien (X-Hestia-Key) qui seul laisse entrer jusqu'au NAS.

export class NasError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message)
  }
}

// Une référence d'album : « a123 » (album du compte Hestia) ou « s<passphrase> » (album partagé avec lui)
export type AlbumRef = string
export const ALBUM_REF = /^(a\d+|s[A-Za-z0-9_-]+)$/

export type Album = { ref: AlbumRef; name: string; count: number; sharedWithMe: boolean }

export type PhotoItem = {
  id: number
  // Change quand la photo change : sert de version pour le cache des miniatures
  key: string
  filename: string
  type: 'photo' | 'video' | 'live'
  // Date de prise de vue (secondes)
  time: number
  width: number | null
  height: number | null
}

export type ThumbSize = 'sm' | 'm' | 'xl'

// Sessions ouvertes, par NAS et compte : gardées le temps que vit le serveur
const sessions = new Map<string, string>()
const sessionKey = (c: SynologyConnection) => `${c.url}|${c.account}`

// Codes Synology : session expirée ou refusée → on se reconnecte une fois
const SESSION_ERRORS = new Set([105, 106, 107, 119])
// Version d'API non prise en charge → on essaie la suivante
const VERSION_ERRORS = new Set([103, 104])

async function post(conn: SynologyConnection, params: Record<string, string | number>) {
  const body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  let response: Response
  try {
    response = await fetch(`${conn.url}/webapi/entry.cgi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Hestia-Key': conn.gatekeeperKey },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new NasError('Le NAS ne répond pas.')
  }
  if (!response.ok) throw new NasError(`Le NAS a répondu ${response.status}.`)
  return response
}

async function login(conn: SynologyConnection): Promise<string> {
  const response = await post(conn, {
    api: 'SYNO.API.Auth', version: 3, method: 'login', account: conn.account, passwd: conn.password, format: 'sid',
  })
  const json = await response.json() as { success: boolean; data?: { sid: string }; error?: { code: number } }
  if (!json.success || !json.data?.sid) {
    const code = json.error?.code
    // 400 : mauvais identifiant ou mot de passe ; 403/404 : double authentification demandée
    if (code === 400) throw new NasError('Identifiant ou mot de passe refusé par le NAS.', code)
    if (code === 403 || code === 404) throw new NasError('Ce compte demande la double authentification.', code)
    throw new NasError(`Connexion au NAS refusée (code ${code ?? '?'}).`, code)
  }
  sessions.set(sessionKey(conn), json.data.sid)
  return json.data.sid
}

async function session(conn: SynologyConnection) {
  return sessions.get(sessionKey(conn)) ?? login(conn)
}

// Appel JSON, avec reconnexion si la session a expiré, et plusieurs versions possibles de l'API
async function call<T>(conn: SynologyConnection, params: Record<string, string | number>, versions: number[] = [1]): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const sid = await session(conn)
    let expired = false
    for (const version of versions) {
      const response = await post(conn, { ...params, version, _sid: sid })
      const json = await response.json() as { success: boolean; data?: T; error?: { code: number } }
      if (json.success) return json.data as T
      const code = json.error?.code ?? 0
      if (VERSION_ERRORS.has(code)) continue
      if (SESSION_ERRORS.has(code)) {
        expired = true
        break
      }
      throw new NasError(`Le NAS a refusé la demande (code ${code}).`, code)
    }
    if (!expired) throw new NasError('Le NAS ne connaît pas cette demande.')
    sessions.delete(sessionKey(conn))
  }
  throw new NasError('Session du NAS refusée.')
}

type RawAlbum = { id: number; name: string; item_count: number; passphrase?: string }
type RawItem = {
  id: number; filename: string; time: number; type: string
  additional?: { thumbnail?: { cache_key?: string }; resolution?: { width?: number; height?: number } }
}

// Les albums du compte Hestia, puis ceux qu'on a partagés avec lui (un album n'apparaît qu'une fois)
export async function listAlbums(conn: SynologyConnection): Promise<Album[]> {
  const [own, shared] = await Promise.all([
    call<{ list: RawAlbum[] }>(conn, { api: 'SYNO.Foto.Browse.Album', method: 'list', offset: 0, limit: 500 }, [1, 2]),
    call<{ list: RawAlbum[] }>(conn, { api: 'SYNO.Foto.Sharing.Misc', method: 'list_shared_with_me_album', offset: 0, limit: 500 }, [1, 2])
      .catch(() => ({ list: [] as RawAlbum[] })),
  ])
  const ownIds = new Set(own.list.map(a => a.id))
  return [
    ...own.list.map(a => ({ ref: `a${a.id}`, name: a.name, count: a.item_count, sharedWithMe: false })),
    ...shared.list
      .filter(a => !ownIds.has(a.id) && a.passphrase && ALBUM_REF.test(`s${a.passphrase}`))
      .map(a => ({ ref: `s${a.passphrase}`, name: a.name, count: a.item_count, sharedWithMe: true })),
  ]
}

function albumParams(ref: AlbumRef): Record<string, string | number> {
  return ref.startsWith('a') ? { album_id: Number(ref.slice(1)) } : { passphrase: ref.slice(1) }
}

export async function listItems(conn: SynologyConnection, ref: AlbumRef, offset = 0, limit = 500): Promise<PhotoItem[]> {
  const data = await call<{ list: RawItem[] }>(conn, {
    api: 'SYNO.Foto.Browse.Item', method: 'list', offset, limit,
    sort_by: 'takentime', sort_direction: 'asc',
    additional: JSON.stringify(['thumbnail', 'resolution']),
    ...albumParams(ref),
  })
  return data.list
    .filter(item => item.additional?.thumbnail?.cache_key)
    .map(item => ({
      id: item.id,
      key: item.additional!.thumbnail!.cache_key!,
      filename: item.filename,
      type: item.type === 'video' || item.type === 'live' ? item.type : 'photo',
      time: item.time,
      width: item.additional?.resolution?.width ?? null,
      height: item.additional?.resolution?.height ?? null,
    }))
}

// Miniature (sm ≈ 240 px, m ≈ 320 px, xl ≈ 1280 px sur le petit côté), en JPEG
export async function getThumbnail(conn: SynologyConnection, ref: AlbumRef, id: number, key: string, size: ThumbSize) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const sid = await session(conn)
    const response = await post(conn, {
      api: 'SYNO.Foto.Thumbnail', method: 'get', version: 1, id, cache_key: key, type: 'unit', size,
      ...(ref.startsWith('s') ? { passphrase: ref.slice(1) } : {}),
      _sid: sid,
    })
    const type = response.headers.get('content-type') ?? ''
    if (type.startsWith('image/')) return { data: await response.arrayBuffer(), type }
    const json = await response.json().catch(() => null) as { error?: { code: number } } | null
    const code = json?.error?.code ?? 0
    if (SESSION_ERRORS.has(code) && attempt === 0) {
      sessions.delete(sessionKey(conn))
      continue
    }
    throw new NasError(`Miniature refusée (code ${code}).`, code)
  }
  throw new NasError('Session du NAS refusée.')
}
