import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Icon from '@/components/ui/Icon'
import AlbumGrid from '@/components/photos/AlbumGrid'
import PhotoSearch from '@/components/photos/PhotoSearch'
import { NasDown, NoNas } from '@/components/photos/PhotosStates'
import { photoFavorites, photoLinks, photosContext } from '@/lib/photos/load'
import { listTimeline, NasError, type TimelineItem } from '@/lib/photos/synology'

// Photos montrées à la fois ; « Plus de photos » en ajoute autant
const PAGE = 240

const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Une photo répond à la recherche si chaque mot tapé est dans son lieu, le nom de son album,
// son mois et son année (« mars 2024 ») ou le nom de son fichier
function matches(item: TimelineItem, words: string[]) {
  const text = normalize([item.place, item.albumName, monthFormat.format(new Date(item.time * 1000)), item.filename].join(' '))
  return words.every(word => text.includes(word))
}

// « Toutes les photos » : celles de tous les albums, par mois, de la plus récente à la plus ancienne ; recherche en bas.
// ?favoris=1 : seulement les favoris du foyer
export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; favoris?: string }> }) {
  const { q = '', page, favoris } = await searchParams
  const onlyFavorites = favoris === '1'
  const { connection, householdId } = await photosContext()
  if (!connection) return <div className="page-wrap"><PageHeader feature="photos" /><NoNas /></div>

  let all: TimelineItem[]
  let favorites: number[]
  try {
    [all, favorites] = await Promise.all([listTimeline(connection), photoFavorites(householdId)])
  } catch (e) {
    if (!(e instanceof NasError)) throw e
    return <div className="page-wrap"><PageHeader feature="photos" /><NasDown message={e.message} /></div>
  }
  const query = q.trim().slice(0, 100)
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const favoriteSet = new Set(favorites)
  const pool = onlyFavorites ? all.filter(item => favoriteSet.has(item.id)) : all
  const found = words.length ? pool.filter(item => matches(item, words)) : pool
  const pages = Math.max(1, Math.min(Number(page) || 1, Math.ceil(found.length / PAGE)))
  const shown = found.slice(0, pages * PAGE)
  const more = new URLSearchParams({ ...(query ? { q: query } : {}), ...(onlyFavorites ? { favoris: '1' } : {}), page: String(pages + 1) })
  const chip = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`

  return (
    <div className="page-wrap pb-28">
      <PageHeader feature="photos" />
      <h2 className="font-display font-semibold text-2xl mb-4">
        {query ? `${found.length} ${found.length > 1 ? 'photos' : 'photo'} pour « ${query} »` : onlyFavorites ? 'Favoris' : 'Toutes les photos'}
      </h2>
      <nav className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-4" aria-label="Filtres">
        <Link href={query ? `/photos/toutes?${new URLSearchParams({ q: query })}` : '/photos/toutes'} className={chip(!onlyFavorites)} aria-current={!onlyFavorites ? 'page' : undefined}>
          Toutes
        </Link>
        <Link href={`/photos/toutes?${new URLSearchParams({ ...(query ? { q: query } : {}), favoris: '1' })}`} className={chip(onlyFavorites)} aria-current={onlyFavorites ? 'page' : undefined}>
          <Icon name="heart" size={16} /> Favoris
        </Link>
      </nav>
      {shown.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="font-semibold">{onlyFavorites && !query ? 'Aucun favori' : 'Aucune photo'}</p>
        </div>
      ) : (
        <AlbumGrid
          key={`${query}|${onlyFavorites}`}
          album={shown[0].album}
          months
          favorites={favorites}
          items={shown.map(item => ({ ...item, links: photoLinks(householdId, item.album, item) }))}
        />
      )}
      {found.length > shown.length && (
        <div className="flex justify-center mt-4">
          <Link href={`/photos/toutes?${more}`} scroll={false} className="pill text-lavande-deep">Plus de photos</Link>
        </div>
      )}
      <PhotoSearch query={query} favorites={onlyFavorites} />
    </div>
  )
}
