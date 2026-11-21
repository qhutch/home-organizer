import Link from 'next/link'
import Poster from '@/components/films/Poster'
import { PlatformBadge } from '@/components/films/Platforms'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { sectionOf, watchDetail } from '@/lib/films/state'
import type { PlatformSettings } from '@/lib/films/platforms'
import type { WatchMember } from '@/lib/films/store'
import type { WatchItem } from '@/types/database'

// Carte d'un film ou d'une série dans la liste : affiche (avec la photo de qui l'a ajouté), titre, où on en est, où le voir
export default function WatchCard({ item, settings, addedBy }: { item: WatchItem; settings: PlatformSettings; addedBy?: WatchMember }) {
  const isNew = sectionOf(item) === 'new'
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
          {addedBy && (
            <span className="absolute left-2 bottom-2" title={`Ajouté par ${addedBy.name}`}>
              <Avatar name={addedBy.name} url={addedBy.avatarUrl} size={28} className="ring-2 ring-surface" />
              <span className="sr-only">Ajouté par {addedBy.name}</span>
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
          <p className={`text-xs mt-0.5 truncate ${isNew ? 'text-sable-deep font-semibold' : 'text-ink-muted'}`}>{watchDetail(item)}</p>
          <div className="mt-1">
            <PlatformBadge providers={item.providers} rentable={item.rentable} settings={settings} />
          </div>
        </div>
      </Link>
    </li>
  )
}
