import { redirect } from 'next/navigation'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getNasConnection } from '@/lib/storage/nas'
import type { AlbumRef, PhotoItem, ThumbSize } from './synology'

// Le foyer de la personne connectée et son NAS de photos (null s'il n'en a pas branché)
export async function photosContext() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  return { connection: await getNasConnection(membership.householdId) }
}

export function thumbUrl(album: AlbumRef, item: Pick<PhotoItem, 'id' | 'key'>, size: ThumbSize) {
  return `/api/photos/thumb?${new URLSearchParams({ a: album, i: String(item.id), k: item.key, s: size })}`
}
