'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getNasConnection } from '@/lib/storage/nas'
import { memberAccountIds, resolveNasSharing } from '@/lib/photos/sharing'
import { addToAlbum, createAlbum, deleteAlbum, listAlbums, NasError, setAlbumAccess, shareAlbum, uploadPhoto, type AccessRole, type ShareMember } from '@/lib/photos/synology'

// Photo envoyée depuis Hestia : sous la limite des Server Actions (4 Mo, next.config.ts), réduite avant si besoin
const PHOTO_MAX = 3_800_000
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'])

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function nas() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  return { uid: user.uid, householdId: membership.householdId, connection: await getNasConnection(membership.householdId) }
}

const failure = (e: unknown) => ({ ok: false as const, error: e instanceof NasError ? e.message : 'Le NAS ne répond pas.' })

// Crée un album sur le NAS (compte Hestia) et le partage tout de suite : les membres du foyer peuvent y ajouter
// des photos depuis leur Synology Photos, « Famille » (si demandé) peut les voir et les télécharger.
export async function createPhotoAlbum(name: string, shareWithFamily: boolean): Promise<Result<{ ref: string }>> {
  const { uid, householdId, connection } = await nas()
  if (!connection) return { ok: false, error: 'Aucun NAS branché' }
  const title = name.trim().replace(/\s+/g, ' ').slice(0, 100)
  if (!title) return { ok: false, error: 'Donne un nom à l’album' }

  const sharing = await resolveNasSharing(householdId, connection)
  const familyGroupId = sharing.familyGroupId ?? null
  const members: ShareMember[] = memberAccountIds(sharing).map(id => ({ type: 'user', id, role: 'upload' }))
  if (shareWithFamily && familyGroupId !== null) members.push({ type: 'group', id: familyGroupId, role: 'download' })

  let albumId: number
  try {
    albumId = await createAlbum(connection, title)
  } catch (e) {
    return failure(e)
  }
  try {
    await shareAlbum(connection, albumId, members)
  } catch (e) {
    // Un album pas partagé ne servirait à personne : on le retire
    await deleteAlbum(connection, albumId).catch(() => {})
    return failure(e)
  }
  // Créé par le compte Hestia du NAS, mais on retient qui l'a créé (filtre « Créés par moi », photo du créateur)
  await db.collection('households').doc(householdId).collection('photoAlbums').doc(String(albumId)).set({
    name: title,
    createdBy: uid,
    sharedWithFamily: shareWithFamily && familyGroupId !== null,
    createdAt: new Date().toISOString(),
  })
  revalidatePath('/photos', 'layout')
  return { ok: true, ref: `a${albumId}` }
}

// Une photo envoyée dans un album créé par Hestia. form : album (« a123 »), file, mtime (secondes)
export async function uploadAlbumPhoto(form: FormData): Promise<Result> {
  const { connection } = await nas()
  if (!connection) return { ok: false, error: 'Aucun NAS branché' }
  const album = String(form.get('album'))
  const file = form.get('file')
  const mtime = Number(form.get('mtime'))
  if (!/^a\d+$/.test(album) || !(file instanceof File)) return { ok: false, error: 'Envoi impossible' }
  if (!PHOTO_TYPES.has(file.type)) return { ok: false, error: `${file.name} : ce n’est pas une photo` }
  if (file.size > PHOTO_MAX) return { ok: false, error: `${file.name} : photo trop lourde` }

  const name = (file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || 'photo.jpg').slice(0, 120)
  try {
    const id = await uploadPhoto(connection, file, name, Number.isFinite(mtime) && mtime > 0 ? Math.floor(mtime) : Math.floor(Date.now() / 1000))
    await addToAlbum(connection, Number(album.slice(1)), [id])
  } catch (e) {
    return failure(e)
  }
  return { ok: true }
}

export async function refreshAlbum(album: string) {
  if (/^a\d+$/.test(album)) revalidatePath(`/photos/${album}`)
  revalidatePath('/photos')
}

// Donne, change ou retire l'accès d'un compte ou d'un groupe du NAS à un album créé par Hestia (role null = retirer)
export async function updateAlbumAccess(
  album: string,
  member: { type: 'user' | 'group'; id: number },
  role: AccessRole | null,
): Promise<Result> {
  const { connection } = await nas()
  if (!connection) return { ok: false, error: 'Aucun NAS branché' }
  if (!/^a\d+$/.test(album) || (member.type !== 'user' && member.type !== 'group') || !Number.isInteger(member.id)) {
    return { ok: false, error: 'Changement impossible' }
  }
  if (role !== null && !['view', 'download', 'upload'].includes(role)) return { ok: false, error: 'Changement impossible' }
  try {
    const found = (await listAlbums(connection)).find(a => a.ref === album && !a.sharedWithMe)
    if (!found) return { ok: false, error: 'Album introuvable' }
    await setAlbumAccess(connection, found.id, found.passphrase, [{ ...member, role }])
  } catch (e) {
    return failure(e)
  }
  revalidatePath(`/photos/${album}`)
  revalidatePath('/photos')
  return { ok: true }
}
