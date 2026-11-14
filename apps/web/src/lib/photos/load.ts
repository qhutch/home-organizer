import { redirect } from 'next/navigation'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getNasConnection } from '@/lib/storage/nas'
import type { AlbumRef, PhotoItem, ThumbSize } from './synology'
import { thumbLink } from './thumb-link'

// Le foyer de la personne connectée et son NAS de photos (null s'il n'en a pas branché)
export async function photosContext() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  return { uid: user.uid, householdId: membership.householdId, connection: await getNasConnection(membership.householdId) }
}

// Les liens des miniatures d'une photo, prêts pour la grille et l'aperçu (signés : voir thumb-link.ts)
export type PhotoLinks = Partial<Record<ThumbSize, string>>
export function photoLinks(household: string, album: AlbumRef, item: PhotoItem): PhotoLinks {
  return Object.fromEntries(item.previews.map(size => [size, thumbLink(household, album, item, size)]))
}

export { thumbLink }
