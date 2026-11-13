import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import PageHeader from '@/components/ui/PageHeader'
import { NasDown, NoNas } from '@/components/photos/PhotosStates'
import { photosContext, thumbUrl } from '@/lib/photos/load'
import { ALBUM_REF, listItems, NasError, type PhotoItem } from '@/lib/photos/synology'
import { FEATURES } from '@/lib/ui/features'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

// Une photo en grand, avec la précédente et la suivante de l'album
export default async function PhotoPage({ params }: { params: Promise<{ album: string; item: string }> }) {
  const { album: ref, item: itemParam } = await params
  const id = Number(itemParam)
  if (!ALBUM_REF.test(ref) || !Number.isInteger(id) || id <= 0) notFound()
  const { connection } = await photosContext()
  if (!connection) return <div className="page-wrap"><PageHeader feature="photos" /><NoNas /></div>

  let items: PhotoItem[]
  try {
    items = await listItems(connection, ref)
  } catch (e) {
    if (!(e instanceof NasError)) throw e
    return <div className="page-wrap"><PageHeader feature="photos" /><NasDown message={e.message} /></div>
  }
  const index = items.findIndex(item => item.id === id)
  if (index < 0) notFound()
  const item = items[index]
  const previous = items[index - 1]
  const next = items[index + 1]

  return (
    <div className="page-wrap flex flex-col gap-3">
      <PageHeader feature="photos" />
      <div className="relative rounded-3xl overflow-hidden bg-prune-soft">
        {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route */}
        <img
          src={thumbUrl(ref, item, 'xl')}
          alt=""
          width={item.width ?? undefined}
          height={item.height ?? undefined}
          className="w-full h-auto max-h-[75dvh] object-contain mx-auto"
        />
      </div>
      <div className="flex items-center gap-2">
        {previous ? (
          <Link href={`/photos/${ref}/${previous.id}`} className={`icon-btn ${FEATURES.photos.text}`} aria-label="Photo précédente"><Icon name="chevronLeft" /></Link>
        ) : <span className="icon-btn invisible" aria-hidden />}
        <p className="flex-1 text-center text-sm text-ink-muted">
          {item.type === 'video' ? 'Vidéo · ' : ''}{dateFormat.format(new Date(item.time * 1000))}
        </p>
        {next ? (
          <Link href={`/photos/${ref}/${next.id}`} className={`icon-btn ${FEATURES.photos.text}`} aria-label="Photo suivante"><Icon name="chevronRight" /></Link>
        ) : <span className="icon-btn invisible" aria-hidden />}
      </div>
    </div>
  )
}
