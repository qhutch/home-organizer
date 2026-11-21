import Link from 'next/link'
import Poster from '@/components/films/Poster'
import { PlatformBadge } from '@/components/films/Platforms'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { airedSeasons, sectionOf, watchDetail } from '@/lib/films/state'
import type { PlatformSettings } from '@/lib/films/platforms'
import type { WatchMember } from '@/lib/films/store'
import type { WatchItem } from '@/types/database'

// Carte d'un film ou d'une série dans la liste : affiche, titre, où on en est, où le voir (et la photo de qui l'a ajouté)
export default function WatchCard({ item, settings, addedBy }: { item: WatchItem; settings: PlatformSettings; addedBy?: WatchMember }) {
  const isNew = sectionOf(item) === 'new'
  // Avancement d'une série commencée : un trait par saison sortie, foncé une fois vue (pas au-delà de 12 saisons)
  const aired = item.kind === 'tv' ? airedSeasons(item).length : 0
  const showProgress = item.seasonsWatched > 0 && aired > 0 && aired <= 12
  return (
    <li>
      <Link href={`/films/${item.id}`} className="flex flex-col gap-2 group">
        <div className="relative rounded-3xl overflow-hidden">
          <Poster path={item.posterPath} kind={item.kind} className="group-active:scale-[0.98] transition-transform" />
          {isNew && (
            <span className="absolute left-2 top-2 rounded-full bg-sable text-sable-ink text-xs font-semibold px-2.5 py-1 flex items-center gap-1">
              <Icon name="sparkles" size={14} />
              Nouveau
            </span>
          )}
          {item.rating && (
            <span className="absolute right-2 bottom-2 rounded-full bg-surface text-sable-deep text-xs font-semibold px-2 py-1 flex items-center gap-0.5">
              <Icon name="star" size={13} className="fill-current" />
              {item.rating}
            </span>
          )}
        </div>
        <div className="min-w-0 px-1">
          <p className="font-semibold leading-snug line-clamp-2">{item.title}</p>
          {showProgress && (
            <div className="flex gap-[3px] mt-1.5" role="img" aria-label={`${Math.min(item.seasonsWatched, aired)} saisons vues sur ${aired}`}>
              {Array.from({ length: aired }, (_, i) => (
                <span key={i} className={`flex-1 h-1 rounded-full ${i < item.seasonsWatched ? 'bg-sable-deep' : 'bg-coconut'}`} />
              ))}
            </div>
          )}
          <p className={`text-xs mt-1 truncate ${isNew ? 'text-sable-deep font-semibold' : 'text-ink-muted'}`}>{watchDetail(item)}</p>
          {/* La plateforme, et à droite la photo de qui l'a ajouté */}
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <PlatformBadge providers={item.providers} rentable={item.rentable} settings={settings} />
            </div>
            {addedBy && (
              <span className="shrink-0" title={`Ajouté par ${addedBy.name}`}>
                <Avatar name={addedBy.name} url={addedBy.avatarUrl} size={18} />
                <span className="sr-only">Ajouté par {addedBy.name}</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
