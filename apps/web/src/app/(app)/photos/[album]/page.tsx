import { notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { NasDown, NoNas } from '@/components/photos/PhotosStates'
import { photosContext } from '@/lib/photos/load'
import AddPhotos from '@/components/photos/AddPhotos'
import AlbumGrid from '@/components/photos/AlbumGrid'
import { ALBUM_REF, listAlbums, listItems, listShareTargets, NasError, type Album, type NasAccount, type PhotoItem } from '@/lib/photos/synology'
import AlbumMenu from '@/components/photos/AlbumMenu'

// Un album : ses photos en grille, de la plus ancienne à la plus récente
export default async function AlbumPage({ params }: { params: Promise<{ album: string }> }) {
  const { album: ref } = await params
  if (!ALBUM_REF.test(ref)) notFound()
  const { connection } = await photosContext()
  if (!connection) {
    return (
      <div className="page-wrap">
        <PageHeader feature="photos" />
        <NoNas />
      </div>
    )
  }

  let data: { album: Album; items: PhotoItem[]; targets: NasAccount[] }
  try {
    const [albums, items, targets] = await Promise.all([
      listAlbums(connection), listItems(connection, ref), listShareTargets(connection).catch(() => []),
    ])
    const album = albums.find(a => a.ref === ref)
    if (!album) notFound()
    data = { album, items, targets }
  } catch (e) {
    if (!(e instanceof NasError)) throw e
    return (
      <div className="page-wrap">
        <PageHeader feature="photos" />
        <NasDown message={e.message} />
      </div>
    )
  }
  const { album, items, targets } = data

  return (
    <div className="page-wrap pb-28">
      <PageHeader feature="photos" />
      <div className="flex items-start gap-2 mb-4">
        <h2 className="font-display font-semibold text-2xl flex-1 min-w-0 break-words">{album.name}</h2>
        <AlbumMenu album={ref} editable={!album.sharedWithMe} owner={album.owner} access={album.access} targets={targets} />
      </div>
      {items.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="font-semibold">Album vide</p>
        </div>
      ) : (
        <AlbumGrid album={ref} items={items} />
      )}
      {/* On ajoute des photos seulement dans les albums créés par Hestia */}
      {ref.startsWith('a') && <AddPhotos album={ref} />}
    </div>
  )
}
