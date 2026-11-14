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

export type Album = {
  ref: AlbumRef
  // Id de l'album sur le NAS (sert à retrouver qui l'a créé dans Hestia : households/{hid}/photoAlbums/{id})
  id: number
  name: string
  count: number
  // Partagé par quelqu'un d'autre avec le compte Hestia (directement ou par un de ses groupes)
  sharedWithMe: boolean
  // Prénom du compte Synology qui l'a créé (null pour les albums du compte Hestia)
  owner: string | null
  // Partagé directement avec le compte Hestia (pas seulement par un groupe)
  sharedWithHestia: boolean
  // Groupes du NAS avec qui l'album est partagé
  groups: number[]
  // Date de création de l'album (secondes)
  created: number
  // Clé de partage de l'album (vide s'il n'est pas encore partagé) et qui y a accès
  passphrase: string
  access: AlbumAccess[]
}

export type AccessRole = 'view' | 'download' | 'upload'
export type AlbumAccess = { type: 'user' | 'group'; id: number; name: string; role: AccessRole }

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
  // Tailles d'aperçu prêtes sur le NAS (vide : aucun aperçu, ex. vidéo HEVC sans le codec sur le NAS)
  previews: ThumbSize[]
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
      // Une redirection (ex. vers HTTPS sur le port 5001) ne passerait pas par le tunnel : on la signale
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    })
  } catch (e) {
    const cause = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : ''
    throw new NasError(`Le NAS ne répond pas${cause ? ` (${cause})` : ''}.`)
  }
  if (response.status >= 300 && response.status < 400) {
    throw new NasError(`Le NAS redirige ailleurs (${response.status} vers ${response.headers.get('location') ?? '?'}).`)
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

type RawAlbum = {
  id: number; name: string; item_count: number; passphrase?: string; create_time?: number
  additional?: { sharing_info?: { owner?: { name?: string }; permission?: { type: string; id: number; name?: string; role?: string }[] } }
}

const myIds = new Map<string, number>()

// Id Synology Photos du compte Hestia lui-même
async function myUserId(conn: SynologyConnection) {
  const cached = myIds.get(sessionKey(conn))
  if (cached !== undefined) return cached
  const me = await call<{ uid: number }>(conn, { api: 'SYNO.Foto.UserInfo', method: 'me' })
  myIds.set(sessionKey(conn), me.uid)
  return me.uid
}
type RawItem = {
  id: number; filename: string; time: number; type: string; owner_user_id?: number
  additional?: { thumbnail?: { cache_key?: string; sm?: string; m?: string; xl?: string }; resolution?: { width?: number; height?: number } }
}

// Les albums du compte Hestia, puis ceux qu'on a partagés avec lui (un album n'apparaît qu'une fois)
export async function listAlbums(conn: SynologyConnection): Promise<Album[]> {
  const additional = JSON.stringify(['sharing_info'])
  const [own, shared, me] = await Promise.all([
    call<{ list: RawAlbum[] }>(conn, { api: 'SYNO.Foto.Browse.Album', method: 'list', offset: 0, limit: 500, additional }, [1, 2]),
    call<{ list: RawAlbum[] }>(conn, { api: 'SYNO.Foto.Sharing.Misc', method: 'list_shared_with_me_album', offset: 0, limit: 500, additional }, [1, 2])
      .catch(() => ({ list: [] as RawAlbum[] })),
    myUserId(conn).catch(() => null),
  ])
  const sharing = (a: RawAlbum) => {
    const permission = a.additional?.sharing_info?.permission ?? []
    return {
      sharedWithHestia: permission.some(p => p.type === 'user' && p.id === me),
      groups: permission.filter(p => p.type === 'group').map(p => p.id),
      passphrase: a.passphrase ?? '',
      access: permission
        .filter(p => (p.type === 'user' || p.type === 'group') && ['view', 'download', 'upload'].includes(p.role ?? ''))
        .map(p => ({ type: p.type as 'user' | 'group', id: p.id, name: p.name ?? '', role: p.role as AccessRole })),
    }
  }
  const ownIds = new Set(own.list.map(a => a.id))
  return [
    ...own.list.map(a => ({ ref: `a${a.id}`, id: a.id, name: a.name, count: a.item_count, created: a.create_time ?? 0, sharedWithMe: false, owner: null, ...sharing(a) })),
    ...shared.list
      .filter(a => !ownIds.has(a.id) && a.passphrase && ALBUM_REF.test(`s${a.passphrase}`))
      .map(a => ({
        ref: `s${a.passphrase}`, id: a.id, name: a.name, count: a.item_count, created: a.create_time ?? 0, sharedWithMe: true,
        owner: a.additional?.sharing_info?.owner?.name ?? null, ...sharing(a),
      })),
  ]
}

function albumParams(ref: AlbumRef): Record<string, string | number> {
  return ref.startsWith('a') ? { album_id: Number(ref.slice(1)) } : { passphrase: ref.slice(1) }
}

// Comptes dont le NAS refuse les photos (ex. compte supprimé : ses photos restent dans les albums,
// mais plus personne ne peut les ouvrir). Vérifié une fois par compte et par serveur, avec une seule miniature.
const blockedOwners = new Map<string, boolean>()

async function ownerBlocked(conn: SynologyConnection, ref: AlbumRef, item: RawItem) {
  const id = `${sessionKey(conn)}|${item.owner_user_id}`
  const known = blockedOwners.get(id)
  if (known !== undefined) return known
  try {
    await getThumbnail(conn, ref, item.id, item.additional!.thumbnail!.cache_key!, 'sm')
  } catch (e) {
    // Seul un vrai refus (introuvable ou interdit) compte ; un NAS lent ne cache rien
    const refused = e instanceof NasError && (e.code === 117 || /\b404\b/.test(e.message))
    if (refused) blockedOwners.set(id, true)
    return refused
  }
  blockedOwners.set(id, false)
  return false
}

export async function listItems(conn: SynologyConnection, ref: AlbumRef, offset = 0, limit = 500): Promise<PhotoItem[]> {
  const data = await call<{ list: RawItem[] }>(conn, {
    api: 'SYNO.Foto.Browse.Item', method: 'list', offset, limit,
    sort_by: 'takentime', sort_direction: 'asc',
    additional: JSON.stringify(['thumbnail', 'resolution']),
    ...albumParams(ref),
  })
  const items = data.list.filter(item => item.additional?.thumbnail?.cache_key)
  // On ne montre pas les photos qu'on ne pourrait pas ouvrir
  const firstByOwner = new Map<number | undefined, RawItem>()
  for (const item of items) if (!firstByOwner.has(item.owner_user_id)) firstByOwner.set(item.owner_user_id, item)
  const blocked = new Set<number | undefined>()
  await Promise.all([...firstByOwner].map(async ([owner, item]) => {
    if (await ownerBlocked(conn, ref, item)) blocked.add(owner)
  }))
  return items
    .filter(item => !blocked.has(item.owner_user_id))
    .map(item => ({
      id: item.id,
      key: item.additional!.thumbnail!.cache_key!,
      filename: item.filename,
      type: item.type === 'video' || item.type === 'live' ? item.type : 'photo',
      time: item.time,
      width: item.additional?.resolution?.width ?? null,
      height: item.additional?.resolution?.height ?? null,
      previews: (['sm', 'm', 'xl'] as const).filter(size => item.additional?.thumbnail?.[size] === 'ready'),
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

// --- Écriture : albums créés par Hestia (dans l'espace perso du compte Hestia), envoi de photos, partage ---
// Recette vérifiée sur le NAS le 14 nov. 2026 : les chaînes passent en JSON (« "nom" »), les listes aussi.

const json = (value: unknown) => JSON.stringify(value)

export async function createAlbum(conn: SynologyConnection, name: string): Promise<number> {
  const data = await call<{ album: { id: number } }>(conn, {
    api: 'SYNO.Foto.Browse.NormalAlbum', method: 'create', name: json(name), item: '[]',
  })
  return data.album.id
}

export async function deleteAlbum(conn: SynologyConnection, albumId: number) {
  await call(conn, { api: 'SYNO.Foto.Browse.Album', method: 'delete', id: json([albumId]) })
}

export type ShareMember = { type: 'user' | 'group'; id: number; role: AccessRole }

// Partage privé : seulement les comptes et groupes donnés (pas de lien public)
export async function shareAlbum(conn: SynologyConnection, albumId: number, members: ShareMember[]) {
  const { passphrase } = await call<{ passphrase: string }>(conn, {
    api: 'SYNO.Foto.Sharing.Passphrase', method: 'set_shared', policy: json('album'), album_id: albumId, enabled: 'true',
  })
  if (members.length) {
    await call(conn, {
      api: 'SYNO.Foto.Sharing.Passphrase', method: 'update', passphrase: json(passphrase), expiration: 0,
      permission: json(members.map(m => ({ role: m.role, action: 'update', member: { type: m.type, id: m.id } }))),
    })
  }
  return passphrase
}

export type NasAccount = { type: 'user' | 'group'; id: number; name: string }

// Comptes et groupes du NAS avec qui on peut partager (sans le compte Hestia lui-même)
export async function listShareTargets(conn: SynologyConnection): Promise<NasAccount[]> {
  const [targets, me] = await Promise.all([
    call<{ list: NasAccount[] }>(conn, { api: 'SYNO.Foto.Sharing.Misc', method: 'list_user_group', offset: 0, limit: 500 }),
    myUserId(conn),
  ])
  return targets.list.filter(t => !(t.type === 'user' && t.id === me))
}

const rootFolders = new Map<string, number>()

// Dossier racine de l'espace perso du compte Hestia (homes/Hestia/Photos)
async function rootFolder(conn: SynologyConnection) {
  const cached = rootFolders.get(sessionKey(conn))
  if (cached) return cached
  const data = await call<{ folder: { id: number } }>(conn, { api: 'SYNO.Foto.Browse.Folder', method: 'get' })
  rootFolders.set(sessionKey(conn), data.folder.id)
  return data.folder.id
}

// Envoie une photo dans l'espace perso du compte Hestia ; rend son id
export async function uploadPhoto(conn: SynologyConnection, file: Blob, name: string, mtime: number): Promise<number> {
  const folder = await rootFolder(conn)
  for (let attempt = 0; attempt < 2; attempt++) {
    const sid = await session(conn)
    const query = new URLSearchParams({ api: 'SYNO.Foto.Upload.Item', method: 'upload_to_folder', version: '1', _sid: sid })
    const body = new FormData()
    body.append('target_folder_id', String(folder))
    body.append('name', json(name))
    body.append('mtime', String(mtime))
    body.append('duplicate', json('rename'))
    body.append('file', file, name)
    let response: Response
    try {
      response = await fetch(`${conn.url}/webapi/entry.cgi?${query}`, {
        method: 'POST', headers: { 'X-Hestia-Key': conn.gatekeeperKey }, body, cache: 'no-store', redirect: 'manual',
        signal: AbortSignal.timeout(120_000),
      })
    } catch {
      throw new NasError('Le NAS ne répond pas.')
    }
    if (!response.ok) throw new NasError(`Le NAS a répondu ${response.status}.`)
    const result = await response.json() as { success: boolean; data?: { id: number }; error?: { code: number } }
    if (result.success && result.data) return result.data.id
    const code = result.error?.code ?? 0
    if (SESSION_ERRORS.has(code) && attempt === 0) {
      sessions.delete(sessionKey(conn))
      continue
    }
    throw new NasError(`Envoi refusé par le NAS (code ${code}).`, code)
  }
  throw new NasError('Session du NAS refusée.')
}

export async function addToAlbum(conn: SynologyConnection, albumId: number, itemIds: number[]) {
  await call(conn, { api: 'SYNO.Foto.Browse.NormalAlbum', method: 'add_item', id: albumId, item: json(itemIds) })
}

// Change qui a accès à un album créé par Hestia : role null = retirer l'accès (action « delete », testée le 14 nov. 2026)
export async function setAlbumAccess(
  conn: SynologyConnection,
  albumId: number,
  passphrase: string,
  changes: { type: 'user' | 'group'; id: number; role: AccessRole | null }[],
) {
  const key = passphrase || await shareAlbum(conn, albumId, [])
  await call(conn, {
    api: 'SYNO.Foto.Sharing.Passphrase', method: 'update', passphrase: json(key), expiration: 0,
    permission: json(changes.map(c => ({ role: c.role ?? 'view', action: c.role ? 'update' : 'delete', member: { type: c.type, id: c.id } }))),
  })
}

// Photo originale (le fichier tel qu'il est sur le NAS), en flux. Testé le 14 nov. 2026 :
// unit_id en liste JSON, passphrase pour un album partagé. Une photo ajoutée par un autre compte que
// le créateur d'un album partagé est refusée (code 117).
export async function downloadOriginal(conn: SynologyConnection, ref: AlbumRef, id: number) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const sid = await session(conn)
    const response = await post(conn, {
      api: 'SYNO.Foto.Download', method: 'download', version: 1, unit_id: json([id]),
      ...(ref.startsWith('s') ? { passphrase: ref.slice(1) } : {}),
      _sid: sid,
    })
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('json') && !type.includes('html') && response.body) {
      const disposition = response.headers.get('content-disposition') ?? ''
      const filename = decodeURIComponent(disposition.match(/filename\*=utf-8''([^;]+)/i)?.[1] ?? '') || `photo-${id}`
      return { body: response.body, type, filename, size: response.headers.get('content-length') }
    }
    const result = await response.json().catch(() => null) as { error?: { code: number } } | null
    const code = result?.error?.code ?? 0
    if (SESSION_ERRORS.has(code) && attempt === 0) {
      sessions.delete(sessionKey(conn))
      continue
    }
    throw new NasError(`Photo refusée par le NAS (code ${code}).`, code)
  }
  throw new NasError('Session du NAS refusée.')
}
