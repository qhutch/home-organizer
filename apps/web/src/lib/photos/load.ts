import { redirect } from 'next/navigation'
import { db } from '@/lib/firebase/admin'
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

// Favoris du foyer (partagés par tous ses membres) : ids des photos du NAS, dans un seul document
// (households/{hid}/photoFavorites/list, champ ids) pour une seule lecture par page
export const favoritesDoc = (householdId: string) =>
  db.collection('households').doc(householdId).collection('photoFavorites').doc('list')

export async function photoFavorites(householdId: string): Promise<number[]> {
  return ((await favoritesDoc(householdId).get()).data()?.ids as number[] | undefined) ?? []
}
