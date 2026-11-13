import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Icon from '@/components/ui/Icon'
import { NasDown, NoNas } from '@/components/photos/PhotosStates'
import { photosContext, thumbUrl } from '@/lib/photos/load'
import { listAlbums, listItems, NasError, type Album, type PhotoItem } from '@/lib/photos/synology'

// Les albums du NAS du foyer : ceux du compte Hestia et ceux qu'on a partagés avec lui dans Synology Photos
export default async function PhotosPage() {
  const { connection } = await photosContext()

  if (!connection) {
    return (
      <div className="page-wrap">
        <PageHeader feature="photos" />
        <NoNas />
      </div>
    )
  }

  let albums: Album[]
  try {
    albums = await listAlbums(connection)
  } catch (e) {
    return (
      <div className="page-wrap">
        <PageHeader feature="photos" />
        <NasDown message={e instanceof NasError ? e.message : 'Le NAS ne répond pas.'} />
      </div>
    )
  }

  // Couverture : la première photo de chaque album
  const covers = await Promise.all(
    albums.map(album => listItems(connection, album.ref, 0, 1).then(items => items[0] ?? null).catch((): PhotoItem | null => null))
  )

  return (
    <div className="page-wrap">
      <PageHeader feature="photos" />
      {albums.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="font-semibold">Aucun album</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {albums.map((album, i) => (
            <li key={album.ref}>
              <Link href={`/photos/${album.ref}`} className="flex flex-col gap-1.5">
                <span className="relative block aspect-square rounded-3xl overflow-hidden bg-prune-soft text-prune-deep">
                  {covers[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniature servie par notre route
                    <img src={thumbUrl(album.ref, covers[i], 'm')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center"><Icon name="photos" size={40} /></span>
                  )}
                </span>
                <span className="text-sm font-medium leading-tight truncate">{album.name}</span>
                <span className="text-xs text-ink-muted -mt-1">
                  {album.count} {album.count > 1 ? 'photos' : 'photo'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
