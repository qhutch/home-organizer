import WatchLibrary from '@/components/films/WatchLibrary'
import { GENRE_LABEL } from '@/lib/films/genres'
import { getWatchList } from './actions'

// Films et séries (?genre=comedie, ?type=film|serie : depuis les cartouches d'une fiche)
export default async function FilmsPage({ searchParams }: { searchParams: Promise<{ genre?: string; type?: string }> }) {
  const params = await searchParams
  const { items, settings, hasKey, uid, members } = await getWatchList()
  const genre = params.genre && GENRE_LABEL.has(params.genre) ? params.genre : null
  const kind = params.type === 'film' ? 'movie' : params.type === 'serie' ? 'tv' : null
  return <WatchLibrary key={`${genre}-${kind}`} items={items} settings={settings} hasKey={hasKey} uid={uid} members={members} initialGenre={genre} initialKind={kind} />
}
