import Link from 'next/link'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Icon from '@/components/ui/Icon'
import { NasDown, NoNas } from '@/components/photos/PhotosStates'
import { photosContext, thumbUrl } from '@/lib/photos/load'
import { ALBUM_REF, listAlbums, listItems, NasError, type Album, type PhotoItem } from '@/lib/photos/synology'

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

  let data: { album: Album; items: PhotoItem[] }
  try {
    const [albums, items] = await Promise.all([listAlbums(connection), listItems(connection, ref)])
    const album = albums.find(a => a.ref === ref)
    if (!album) notFound()
    data = { album, items }
  } catch (e) {
    if (!(e instanceof NasError)) throw e
    return (
      <div className="page-wrap">
        <PageHeader feature="photos" />
        <NasDown message={e.message} />
      </div>
    )
  }
  const { album, items } = data

  return (
    <div className="page-wrap">
      <PageHeader feature="photos" />
      <h2 className="font-display font-semibold text-2xl mb-4">{album.name}</h2>
      {items.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="font-semibold">Album vide</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
          {items.map(item => (
            <li key={item.id}>
              <Link href={`/photos/${ref}/${item.id}`} className="relative block aspect-square rounded-lg overflow-hidden bg-prune-soft">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniature servie par notre route */}
                <img src={thumbUrl(ref, item, 'sm')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                {item.type === 'video' && (
                  <span className="absolute bottom-1 right-1 rounded-full bg-ink/60 p-1 text-surface" aria-label="Vidéo"><Icon name="play" size={14} /></span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
