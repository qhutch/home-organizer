'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import AddField from '@/components/ui/AddField'
import Icon from '@/components/ui/Icon'
import WatchCard from '@/components/films/WatchCard'
import AddWatchSheet from '@/components/films/AddWatchSheet'
import { GENRES, GENRE_LABEL } from '@/lib/films/genres'
import { onOurPlatforms, type PlatformSettings } from '@/lib/films/platforms'
import { sectionOf, today, type WatchSection } from '@/lib/films/state'
import { FEATURES } from '@/lib/ui/features'
import type { WatchItem, WatchKind } from '@/types/database'
import type { WatchMember } from '@/lib/films/store'

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const SECTIONS: { id: WatchSection; title: string }[] = [
  { id: 'new', title: 'Nouveautés' },
  { id: 'watching', title: 'En cours' },
  { id: 'towatch', title: 'À voir' },
  { id: 'soon', title: 'Bientôt' },
  { id: 'seen', title: 'Vus' },
]

// Au-delà, « Vus » se replie
const SEEN_SHOWN = 8

// Page Films et séries : Ensemble ou Moi, filtres (films, séries, chez nous, genres),
// puis les nouveautés, ce qu'on regarde, ce qu'on veut voir, ce qui arrive, ce qu'on a vu.
// On ajoute en collant un lien (Instagram…) ou un titre dans la barre du bas.
export default function WatchLibrary({ items, settings, hasKey, uid, members, initialGenre, initialKind }: {
  items: WatchItem[]
  members: Record<string, WatchMember>
  settings: PlatformSettings
  hasKey: boolean
  uid: string
  initialGenre: string | null
  initialKind: WatchKind | null
}) {
  const [forMe, setForMe] = useState(false)
  const [kind, setKind] = useState<WatchKind | null>(initialKind)
  const [genre, setGenre] = useState<string | null>(initialGenre)
  const [ours, setOurs] = useState(false)
  const [allSeen, setAllSeen] = useState(false)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  // Barre du bas : recherche dans la liste à gauche, + à droite (qui s'ouvre en champ « lien ou titre »)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const tabItems = useMemo(() => items.filter(i => (forMe ? i.owner === uid : i.owner === null)), [items, forMe, uid])
  const genres = useMemo(() => GENRES.filter(g => tabItems.some(i => i.genres.includes(g.id))), [tabItems])
  const terms = normalize(search)
  const shown = tabItems.filter(i =>
    (!terms || normalize(`${i.title} ${i.originalTitle ?? ''} ${i.genres.map(g => GENRE_LABEL.get(g)).join(' ')}`).includes(terms))
    && (!kind || i.kind === kind) && (!genre || i.genres.includes(genre)) && (!ours || onOurPlatforms(i.providers, settings)))
  const day = today()
  const bySection = new Map<WatchSection, WatchItem[]>(SECTIONS.map(s => [s.id, []]))
  for (const item of shown) bySection.get(sectionOf(item, day))!.push(item)
  // Les plus récents d'abord ; « Bientôt » par date de sortie
  for (const [id, list] of bySection) {
    if (id === 'soon') list.sort((a, b) => (a.nextAirDate ?? a.releaseDate ?? '9').localeCompare(b.nextAirDate ?? b.releaseDate ?? '9'))
    else if (id === 'seen') list.sort((a, b) => (b.watchedAt ?? b.progressAt ?? b.createdAt).localeCompare(a.watchedAt ?? a.progressAt ?? a.createdAt))
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const filtered = Boolean(kind || genre || ours || terms)

  function submit() {
    setAdding(input.trim())
    setInput('')
  }

  return (
    <div className="page-wrap pb-32">
      <PageHeader feature="films" />

      {!hasKey && (
        <Link href="/settings#films" className="card flex items-center gap-3 mb-5 text-sable-deep hover:bg-coconut/40 transition-colors">
          <Icon name="settings" size={24} className="shrink-0" />
          <span className="flex-1 font-semibold">Brancher TMDB pour trouver les films</span>
          <Icon name="chevronRight" size={20} className="shrink-0" />
        </Link>
      )}

      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => setForMe(false)} aria-pressed={!forMe} className={`chip flex items-center gap-1.5 ${!forMe ? 'is-active' : ''}`}>
          <Icon name="users" size={18} />
          Ensemble
        </button>
        <button type="button" onClick={() => setForMe(true)} aria-pressed={forMe} className={`chip flex items-center gap-1.5 ${forMe ? 'is-active' : ''}`}>
          <Icon name="user" size={18} />
          Moi
        </button>
      </div>

      {tabItems.length > 0 && (
        <div className="-mx-4 px-4 mb-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          <button type="button" onClick={() => setKind(k => (k === 'movie' ? null : 'movie'))} aria-pressed={kind === 'movie'} className={`chip shrink-0 ${kind === 'movie' ? 'is-active' : ''}`}>Films</button>
          <button type="button" onClick={() => setKind(k => (k === 'tv' ? null : 'tv'))} aria-pressed={kind === 'tv'} className={`chip shrink-0 ${kind === 'tv' ? 'is-active' : ''}`}>Séries</button>
          <button type="button" onClick={() => setOurs(o => !o)} aria-pressed={ours} aria-label="Sur nos abonnements" title="Sur nos abonnements" className={`chip shrink-0 flex items-center ${ours ? 'is-active' : ''}`}>
            {/* Une télé cochée : ce qu'on peut regarder avec nos abonnements (Tabler n'a pas cette icône toute faite) */}
            <span className="relative flex" aria-hidden>
              <Icon name="tv" size={20} />
              <span className="absolute left-1/2 top-[57%] -translate-x-1/2 -translate-y-1/2 flex"><Icon name="check" size={11} /></span>
            </span>
          </button>
        </div>
      )}

      {/* Les genres sur leur propre rangée */}
      {genres.length > 0 && (
        <div className="-mx-4 px-4 mb-5 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          {genres.map(g => (
            <button key={g.id} type="button" onClick={() => setGenre(c => (c === g.id ? null : g.id))} aria-pressed={genre === g.id} className={`chip shrink-0 ${genre === g.id ? 'is-active' : ''}`}>
              {g.label}
            </button>
          ))}
        </div>
      )}

      {filtered && (
        <div className="flex items-center justify-between mb-4 text-sm">
          <p className="text-ink-muted">{shown.length} {shown.length > 1 ? 'résultats' : 'résultat'}</p>
          <button type="button" onClick={() => { setKind(null); setGenre(null); setOurs(false); setSearch('') }} className={`font-semibold ${FEATURES.films.text}`}>
            Effacer les filtres
          </button>
        </div>
      )}

      {!shown.length && (
        <div className="card py-12 flex flex-col items-center gap-2 text-center">
          <span className={FEATURES.films.text}><Icon name="movie" size={32} /></span>
          <p className="font-semibold">{filtered ? 'Rien avec ces filtres' : forMe ? 'Rien dans « Moi » pour l’instant' : 'Rien à voir pour l’instant'}</p>
        </div>
      )}

      {SECTIONS.map(({ id, title }) => {
        const list = bySection.get(id)!
        if (!list.length) return null
        const visible = id === 'seen' && !allSeen ? list.slice(0, SEEN_SHOWN) : list
        return (
          <section key={id} className="mb-8">
            <h2 className={`font-display font-semibold text-lg mb-3 flex items-baseline gap-2 ${id === 'new' ? FEATURES.films.text : ''}`}>
              {id === 'new' && <Icon name="sparkles" size={20} className="self-center" />}
              {title}
              <span className="text-sm font-sans font-medium text-ink-muted">{list.length}</span>
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-5">
              {visible.map(item => <WatchCard key={item.id} item={item} settings={settings} addedBy={forMe ? undefined : members[item.addedBy]} />)}
            </ul>
            {visible.length < list.length && (
              <button type="button" onClick={() => setAllSeen(true)} className={`pill mt-4 ${FEATURES.films.text}`}>
                Voir les {list.length} vus
              </button>
            )}
          </section>
        )
      })}

      <ActionBar detached>
        {!addOpen && (
          <div className={`${barGroup} min-w-0 ${searching || search ? 'flex-1' : 'w-56'}`}>
            <span className="pl-3 text-ink-muted"><Icon name="search" size={20} /></span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Titre ou genre…"
              aria-label="Chercher un film ou une série par titre ou par genre"
              autoComplete="off"
              enterKeyHint="search"
              onFocus={() => setSearching(true)}
              onBlur={() => setSearching(false)}
              className="flex-1 min-w-0 bg-transparent pl-2 pr-3 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setSearch('')} className="icon-btn" aria-label="Effacer">
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
        )}
        {hasKey && !searching && (
          <AddField
            value={input}
            onChange={setInput}
            onSubmit={submit}
            onOpenChange={setAddOpen}
            placeholder="Coller un lien ou un titre…"
            label="Ajouter un film ou une série"
            fill={FEATURES.films.fill}
            enterKeyHint="search"
          />
        )}
      </ActionBar>

      {adding && <AddWatchSheet query={adding} forMe={forMe} settings={settings} onClose={() => setAdding(null)} />}
    </div>
  )
}
