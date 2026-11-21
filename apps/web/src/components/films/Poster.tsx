import Icon from '@/components/ui/Icon'
import { posterUrl } from '@/lib/films/images'
import type { WatchKind } from '@/types/database'

// Affiche d'un film ou d'une série (2:3) ; sans affiche, son icône sur fond sable doux
export default function Poster({ path, kind, size = 'w342', className = '' }: { path: string | null; kind: WatchKind; size?: 'w185' | 'w342' | 'w500'; className?: string }) {
  const url = posterUrl(path, size)
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- affiche déjà à la bonne taille, servie par TMDB
    return <img src={url} alt="" loading="lazy" className={`aspect-[2/3] w-full object-cover bg-sable-soft ${className}`} />
  }
  return (
    <span aria-hidden className={`aspect-[2/3] w-full flex items-center justify-center bg-sable-soft text-sable-deep ${className}`}>
      <Icon name={kind === 'tv' ? 'tv' : 'movie'} size={36} />
    </span>
  )
}
