'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { addWatch, findWatch, previewWatch, type WatchPreview } from '@/app/(app)/films/actions'
import Sheet from '@/components/ui/Sheet'
import Icon from '@/components/ui/Icon'
import Poster from '@/components/films/Poster'
import { PlatformList } from '@/components/films/Platforms'
import { airedSeasons } from '@/lib/films/state'
import { FEATURES } from '@/lib/ui/features'
import type { PlatformSettings } from '@/lib/films/platforms'
import type { Candidate } from '@/lib/films/tmdb'
import type { LinkPost } from '@/lib/films/from-link'

// Ajout depuis un lien ou un titre : Hestia montre ce qu'elle a trouvé, on confirme
// (ou on choisit parmi les autres réponses, ou on cherche un autre titre).
export default function AddWatchSheet({ query, forMe: initialForMe, settings, onClose }: {
  query: string
  forMe: boolean
  settings: PlatformSettings
  onClose: () => void
}) {
  const router = useRouter()
  const isLink = /^https?:\/\//i.test(query.trim())
  const [search, setSearch] = useState(isLink ? '' : query)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  // Pas sûr du titre (lien dont le texte ne le dit pas) : on montre le post et on demande le titre
  const [sure, setSure] = useState(false)
  const [post, setPost] = useState<LinkPost | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState(0)
  const [preview, setPreview] = useState<WatchPreview | null>(null)
  const [forMe, setForMe] = useState(initialForMe)
  const [seen, setSeen] = useState(false)
  const [searching, startSearch] = useTransition()
  const [loadingPreview, startPreview] = useTransition()
  const [adding, startAdd] = useTransition()

  function run(text: string) {
    startSearch(async () => {
      setError(null)
      setPreview(null)
      const result = await findWatch(text)
      setCandidates(result.candidates)
      setSure(result.sure)
      if (result.post) setPost(result.post)
      setPicked(0)
      if (result.error) setError(result.error)
    })
  }

  useEffect(() => {
    run(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule recherche à l'ouverture
  }, [])

  const candidate = sure ? candidates?.[picked] ?? null : null
  useEffect(() => {
    if (!candidate) return
    startPreview(async () => {
      const result = await previewWatch(candidate.kind, candidate.tmdbId)
      if ('error' in result) setError(result.error)
      else setPreview(result)
    })
  }, [candidate])

  function add() {
    if (!candidate) return
    startAdd(async () => {
      const result = await addWatch({ kind: candidate.kind, tmdbId: candidate.tmdbId, forMe, seen, sourceUrl: isLink ? query.trim() : null })
      if ('error' in result) {
        setError(result.error)
        return
      }
      // Une série déjà vue : on va cocher où on en est
      if (seen && candidate.kind === 'tv') router.push(`/films/${result.id}`)
      else {
        router.refresh()
        onClose()
      }
    })
  }

  const details = preview?.details
  const meta = candidate && [
    candidate.kind === 'tv' ? 'Série' : 'Film',
    candidate.year,
    details?.kind === 'tv' && details.seasons.length ? `${airedSeasons(details).length} saison${airedSeasons(details).length > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')
  const others = candidates?.filter((_, i) => !sure || i !== picked) ?? []
  const asking = Boolean(candidates) && !sure

  return (
    <Sheet title="Ajouter" onClose={onClose}>
      {searching && !candidates && (
        <div className="flex gap-4" aria-busy="true">
          <div className="skeleton bg-sable-soft w-28 aspect-[2/3] rounded-2xl shrink-0" />
          <div className="flex-1 flex flex-col gap-2 pt-1">
            <div className="skeleton bg-sable-soft h-6 rounded-full w-3/4" />
            <div className="skeleton bg-sable-soft h-4 rounded-full w-1/2" />
          </div>
          <span className="sr-only">Recherche…</span>
        </div>
      )}

      {post && (asking ? (
        <div className="flex flex-col gap-3">
          {post.image && (
            // eslint-disable-next-line @next/next/no-img-element -- image du post, déjà téléchargée par le serveur
            <img src={post.image} alt="" className="w-full max-h-80 object-contain rounded-3xl bg-sable-soft" />
          )}
          {post.author && <p className="text-sm font-semibold">@{post.author}</p>}
          {post.caption && <p className="text-sm text-ink-muted line-clamp-3 -mt-2">{post.caption}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {post.image && (
            // eslint-disable-next-line @next/next/no-img-element -- image du post, déjà téléchargée par le serveur
            <img src={post.image} alt="" className="w-12 h-12 object-cover rounded-xl bg-sable-soft shrink-0" />
          )}
          <p className="text-sm text-ink-muted min-w-0 truncate">{post.author ? `@${post.author}` : 'Le post'}</p>
        </div>
      ))}

      {asking && (
        <SearchField value={search} onChange={setSearch} onSubmit={() => search.trim() && run(search)} busy={searching} label="Quel est le titre ?" autoFocus />
      )}

      {candidate && (
        <div className={`flex flex-col gap-4 ${searching ? 'opacity-50' : ''}`}>
          <div className="flex gap-4">
            <div className="w-28 shrink-0 rounded-2xl overflow-hidden">
              <Poster path={candidate.posterPath} kind={candidate.kind} size="w185" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-xl leading-tight tracking-tight">{candidate.title}</p>
              <p className="text-sm text-ink-muted mt-1">{meta}</p>
              {preview?.others.map(o => (
                <p key={o} className="text-sm text-sable-deep font-semibold mt-2 flex items-center gap-1.5">
                  <Icon name="eye" size={18} className="shrink-0" />
                  {o}
                </p>
              ))}
            </div>
          </div>
          {candidate.overview && <p className="text-sm text-ink-muted line-clamp-4">{candidate.overview}</p>}
          {details ? (
            <PlatformList providers={details.providers} rentable={details.rentable} settings={settings} />
          ) : (
            loadingPreview && <div className="skeleton bg-sable-soft h-14 rounded-3xl" aria-hidden />
          )}

          {preview?.existingId ? (
            <Link href={`/films/${preview.existingId}`} className={`btn-feature ${FEATURES.films.fill}`}>
              Déjà dans la liste : ouvrir la fiche
            </Link>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`chip ${!forMe ? 'is-active' : ''}`} aria-pressed={!forMe} onClick={() => setForMe(false)}>Ensemble</button>
                <button type="button" className={`chip ${forMe ? 'is-active' : ''}`} aria-pressed={forMe} onClick={() => setForMe(true)}>Moi</button>
                <span className="w-px bg-line mx-1" aria-hidden />
                <button type="button" className={`chip ${!seen ? 'is-active' : ''}`} aria-pressed={!seen} onClick={() => setSeen(false)}>À voir</button>
                <button type="button" className={`chip ${seen ? 'is-active' : ''}`} aria-pressed={seen} onClick={() => setSeen(true)}>Déjà vu</button>
              </div>
              <button type="button" className={`btn-feature ${FEATURES.films.fill}`} disabled={adding || !preview} onClick={add}>
                <Icon name="plus" />
                {adding ? 'Ajout…' : seen ? 'Ajouter aux vus' : 'Ajouter à « À voir »'}
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}

      {others.length > 0 && (
        <div>
          <h4 className="eyebrow mb-2">{asking ? 'Peut-être' : 'Pas le bon ?'}</h4>
          <ul className="flex flex-col gap-1">
            {others.map(c => (
              <li key={`${c.kind}-${c.tmdbId}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(candidates!.indexOf(c))
                    setSure(true)
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl p-1.5 text-left hover:bg-coconut/60 transition-colors"
                >
                  <span className="w-10 shrink-0 rounded-lg overflow-hidden"><Poster path={c.posterPath} kind={c.kind} size="w185" /></span>
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{c.title}</span>
                    <span className="block text-xs text-ink-muted">{[c.kind === 'tv' ? 'Série' : 'Film', c.year].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!asking && <SearchField value={search} onChange={setSearch} onSubmit={() => search.trim() && run(search)} busy={searching} label="Chercher un autre titre…" />}
    </Sheet>
  )
}

function SearchField({ value, onChange, onSubmit, busy, label, autoFocus }: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  busy: boolean
  label: string
  autoFocus?: boolean
}) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        // Le clavier se ferme pour laisser voir les réponses
        ;(document.activeElement as HTMLElement | null)?.blur()
        onSubmit()
      }}
      className="flex items-center gap-1 bg-surface hairline rounded-full p-1.5"
    >
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        enterKeyHint="search"
        autoFocus={autoFocus}
        className="flex-1 min-w-0 bg-transparent px-3 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint"
      />
      <button type="submit" aria-label="Chercher" disabled={busy || !value.trim()} className={`icon-btn-fill ${FEATURES.films.fill}`}>
        <Icon name="search" />
      </button>
    </form>
  )
}
