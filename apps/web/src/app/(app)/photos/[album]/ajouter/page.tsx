import Link from 'next/link'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Cover from '@/components/photos/Cover'
import NasPicker from '@/components/photos/NasPicker'
import { NasDown, NoNas } from '@/components/photos/PhotosStates'
import { photoLinks, photosContext, thumbLink } from '@/lib/photos/load'
import { ALBUM_REF, listAlbums, listItems, NasError, type Album, type PhotoItem } from '@/lib/photos/synology'

// « Déjà sur le NAS » : ajouter à un album créé par Hestia des photos prises dans un autre album.
// D'abord la liste des albums, puis (?depuis=<album>) ses photos à cocher.
export default async function AddFromNasPage({ params, searchParams }: {
  params: Promise<{ album: string }>
  searchParams: Promise<{ depuis?: string }>
}) {
  const { album: ref } = await params
  const { depuis } = await searchParams
  if (!/^a\d+$/.test(ref)) notFound()
  const from = depuis && ALBUM_REF.test(depuis) && depuis !== ref ? depuis : null
  const { connection, householdId } = await photosContext()
  if (!connection) return <div className="page-wrap"><PageHeader feature="photos" /><NoNas /></div>

  let data: { albums: Album[]; items: PhotoItem[] | null }
  try {
    const albums = await listAlbums(connection)
    data = { albums, items: from && albums.some(a => a.ref === from) ? await listItems(connection, from) : null }
  } catch (e) {
    if (!(e instanceof NasError)) throw e
    return <div className="page-wrap"><PageHeader feature="photos" /><NasDown message={e.message} /></div>
  }
  const { albums, items } = data
  const album = albums.find(a => a.ref === ref)
  if (!album) notFound()

  if (from) {
    const source = albums.find(a => a.ref === from)
    if (!source || !items) notFound()
    return (
      <div className="page-wrap pb-28">
        <PageHeader feature="photos" />
        <h2 className="font-display font-semibold text-2xl break-words mb-4">{source.name}</h2>
        <NasPicker
          album={ref}
          albumName={album.name}
          from={from}
          items={items.map(item => ({ ...item, links: photoLinks(householdId, from, item) }))}
        />
      </div>
    )
  }

  const others = albums.filter(a => a.ref !== ref && a.count > 0)
  return (
    <div className="page-wrap pb-12">
      <PageHeader feature="photos" />
      <h2 className="font-display font-semibold text-2xl break-words mb-4">Ajouter à « {album.name} »</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {others.map(a => (
          <li key={a.ref}>
            <Link href={`/photos/${ref}/ajouter?depuis=${a.ref}`} className="flex flex-col gap-1.5">
              <Cover src={a.cover ? thumbLink(householdId, a.ref, a.cover, 'm') : null} />
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight truncate">{a.name}</span>
                <span className="text-xs text-ink-muted truncate">
                  {a.owner && `${a.owner} · `}{a.count} {a.count > 1 ? 'photos' : 'photo'}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
