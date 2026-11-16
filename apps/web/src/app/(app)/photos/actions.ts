'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getNasConnection } from '@/lib/storage/nas'
import { resolveNasSharing } from '@/lib/photos/sharing'
import { addToAlbum, createAlbum, deleteAlbum, deleteItems, ownItemIds, listAlbums, NasError, setAlbumAccess, shareAlbum, uploadPhoto, type AccessRole, type ShareMember } from '@/lib/photos/synology'

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

// Crée un album sur le NAS (compte Hestia) et le partage tout de suite avec les accès choisis
// (par défaut : les membres du foyer peuvent ajouter des photos ; Famille, au choix, peut voir).
export async function createPhotoAlbum(
  name: string,
  access: { type: 'user' | 'group'; id: number; role: AccessRole }[],
): Promise<Result<{ ref: string }>> {
  const { uid, householdId, connection } = await nas()
  if (!connection) return { ok: false, error: 'Aucun NAS branché' }
  const title = name.trim().replace(/\s+/g, ' ').slice(0, 100)
  if (!title) return { ok: false, error: 'Donne un nom à l’album' }
  const members: ShareMember[] = access.filter(a =>
    (a.type === 'user' || a.type === 'group') && Number.isInteger(a.id) && ['view', 'download', 'upload'].includes(a.role))
  const sharing = await resolveNasSharing(householdId, connection)
  const familyGroupId = sharing.familyGroupId ?? null

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
    sharedWithFamily: familyGroupId !== null && members.some(m => m.type === 'group' && m.id === familyGroupId),
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

// Supprime un album créé dans Hestia, seulement par qui l'a créé. Sur Synology Photos, supprimer un album
// ne supprime pas ses photos : withPhotos les supprime aussi (seulement celles du compte Hestia, voir ownItemIds).
// Un album créé directement dans Synology Photos (compte d'un membre) n'est pas au compte Hestia : il ne peut pas le supprimer.
export async function deletePhotoAlbum(album: string, withPhotos: boolean): Promise<Result> {
  const { uid, householdId, connection } = await nas()
  if (!connection) return { ok: false, error: 'Aucun NAS branché' }
  if (!/^a\d+$/.test(album)) return { ok: false, error: 'Suppression impossible' }
  const albumId = Number(album.slice(1))
  const ref = db.collection('households').doc(householdId).collection('photoAlbums').doc(String(albumId))
  const created = await ref.get()
  if (created.data()?.createdBy !== uid) return { ok: false, error: 'Seul qui a créé l’album peut le supprimer' }
  try {
    if (withPhotos) {
      const items = await ownItemIds(connection, albumId)
      if (items.length) await deleteItems(connection, items)
    }
    await deleteAlbum(connection, albumId)
  } catch (e) {
    return failure(e)
  }
  await ref.delete()
  revalidatePath('/photos', 'layout')
  return { ok: true }
}
