'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { deleteWatch, setWatchReview, updateWatch } from '@/app/(app)/films/actions'
import PageHeader from '@/components/ui/PageHeader'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import CheckButton from '@/components/works/CheckButton'
import Poster from '@/components/films/Poster'
import { PlatformList } from '@/components/films/Platforms'
import { GENRE_LABEL } from '@/lib/films/genres'
import { airedSeasons, formatDate, today } from '@/lib/films/state'
import { FEATURES } from '@/lib/ui/features'
import type { PlatformSettings } from '@/lib/films/platforms'
import type { WatchMember } from '@/lib/films/store'
import type { WatchItem } from '@/types/database'

function duration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`
}

const SHOW_STATUS: Record<string, string> = { ended: 'Terminée', canceled: 'Arrêtée', returning: 'Suite prévue', planned: 'En préparation' }

// Fiche d'un film ou d'une série : tout s'enregistre au toucher.
// D'où vient le lien : « Instagram », « YouTube »… sinon le nom du site
function sourceName(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const known: [RegExp, string][] = [[/instagram\.com$/, 'Instagram'], [/tiktok\.com$/, 'TikTok'], [/youtube\.com$|youtu\.be$/, 'YouTube'], [/facebook\.com$/, 'Facebook'], [/imdb\.com$/, 'IMDb'], [/allocine\.fr$/, 'AlloCiné'], [/themoviedb\.org$/, 'TMDB']]
    return known.find(([re]) => re.test(host))?.[1] ?? host
  } catch {
    return 'le lien'
  }
}

export default function WatchEditor({ item: initial, settings, members }: {
  item: WatchItem
  settings: PlatformSettings
  members: Record<string, WatchMember>
}) {
  const addedBy = members[initial.addedBy]
  const commentAuthor = initial.commentBy ? members[initial.commentBy] ?? null : null
  const [item, setItem] = useState(initial)
  const [comment, setComment] = useState(initial.comment ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [, startTransition] = useTransition()
  const day = today()
  const aired = airedSeasons(item, day)
  const upcoming = item.seasons.filter(s => !s.airDate || s.airDate > day)

  function change(patch: Partial<WatchItem>, save: Parameters<typeof updateWatch>[1]) {
    setItem(i => ({ ...i, ...patch }))
    startTransition(() => updateWatch(item.id, save))
  }

  function setSeasons(n: number) {
    change({ seasonsWatched: n, status: n > 0 ? 'watching' : 'towatch', progressAt: n > 0 ? new Date().toISOString() : null }, { seasonsWatched: n })
  }

  function rate(n: number) {
    const rating = item.rating === n ? null : n
    setItem(i => ({ ...i, rating }))
    startTransition(() => setWatchReview(item.id, { rating, comment }))
  }

  function saveComment() {
    if (comment.trim() === (item.comment ?? '')) return
    setItem(i => ({ ...i, comment: comment.trim() || null }))
    startTransition(() => setWatchReview(item.id, { rating: item.rating, comment }))
  }

  const meta = [
    item.kind === 'tv' ? 'Série' : 'Film',
    item.year,
    item.runtime ? duration(item.runtime) : null,
    item.kind === 'tv' && aired.length ? `${aired.length} saison${aired.length > 1 ? 's' : ''}` : null,
    item.showStatus ? SHOW_STATUS[item.showStatus] : null,
  ].filter(Boolean).join(' · ')
  const forMe = item.owner !== null
  const seen = item.status === 'done'

  return (
    <div className="page-wrap pb-16 max-w-2xl">
      <PageHeader feature="films" />

      <div className="flex gap-4 mb-6">
        <div className="w-32 sm:w-40 shrink-0 rounded-3xl overflow-hidden">
          <Poster path={item.posterPath} kind={item.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl leading-tight break-words">{item.title}</h2>
          {item.originalTitle && item.originalTitle !== item.title && <p className="text-sm text-ink-muted mt-1">{item.originalTitle}</p>}
          <p className="text-sm text-ink-muted mt-2">{meta}</p>
          {(addedBy || item.sourceUrl) && (
            <p className="text-sm text-ink-muted mt-3 flex items-center gap-2 flex-wrap">
              {addedBy && (
                <>
                  <Avatar name={addedBy.name} url={addedBy.avatarUrl} size={24} />
                  <span>Ajouté par {addedBy.name}{item.createdAt ? ` le ${formatDate(item.createdAt)}` : ''}</span>
                </>
              )}
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className={`font-semibold inline-flex items-center gap-1 hover:opacity-70 ${FEATURES.films.text}`}>
                  {addedBy ? 'depuis' : 'Vu sur'} {sourceName(item.sourceUrl)}
                  <Icon name="external" size={16} />
                </a>
              )}
            </p>
          )}
          {item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.genres.map(g => (
                <Link key={g} href={`/films?genre=${g}`} className="rounded-full bg-sable-soft text-sable-deep text-sm font-medium px-3 py-1 hover:opacity-80">
                  {GENRE_LABEL.get(g) ?? g}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mb-6">
        <h3 className="eyebrow mb-2">Où le voir</h3>
        <PlatformList providers={item.providers} rentable={item.rentable} settings={settings} />
      </section>

      <section className="mb-6 flex flex-wrap gap-2">
        <button type="button" className={`chip flex items-center gap-1.5 ${!forMe ? 'is-active' : ''}`} aria-pressed={!forMe} onClick={() => forMe && change({ owner: null }, { forMe: false })}>
          <Icon name="users" size={18} />
          Ensemble
        </button>
        <button type="button" className={`chip flex items-center gap-1.5 ${forMe ? 'is-active' : ''}`} aria-pressed={forMe} onClick={() => !forMe && change({ owner: 'me' }, { forMe: true })}>
          <Icon name="user" size={18} />
          Moi
        </button>
      </section>

      {item.kind === 'movie' ? (
        <section className="mb-8">
          {seen ? (
            <div className="flex items-center gap-3 flex-wrap">
              <p className={`font-semibold flex items-center gap-2 ${FEATURES.films.text}`}>
                <Icon name="circleChecked" />
                {item.watchedAt ? `Vu le ${formatDate(item.watchedAt)}` : 'Vu'}
              </p>
              <button type="button" className={`btn-feature-outline ${FEATURES.films.text}`} onClick={() => change({ status: 'towatch', watchedAt: null }, { seen: false })}>
                Pas encore vu
              </button>
            </div>
          ) : (
            <button type="button" className={`btn-feature ${FEATURES.films.fill}`} onClick={() => change({ status: 'done', watchedAt: new Date().toISOString() }, { seen: true })}>
              <Icon name="eye" />
              On l’a vu
            </button>
          )}
        </section>
      ) : (
        <section className="mb-8">
          <h3 className="font-display font-semibold text-lg mb-2 flex items-baseline gap-2">
            Saisons
            {aired.length > 0 && <span className="text-sm font-sans font-medium text-ink-muted">{item.seasonsWatched} / {aired.length} vues</span>}
          </h3>
          <ul className="flex flex-col gap-2">
            {aired.map(s => {
              const done = s.number <= item.seasonsWatched
              return (
                <li key={s.number} className={`rounded-3xl flex items-center gap-1 pl-1.5 pr-4 ${done ? 'bg-surface hairline' : FEATURES.films.soft}`}>
                  <CheckButton
                    feature="films"
                    done={done}
                    label={done ? `Saison ${s.number} pas encore vue` : `Saison ${s.number} vue`}
                    onClick={() => setSeasons(done ? s.number - 1 : s.number)}
                  />
                  <div className="flex-1 min-w-0 py-3">
                    <p className={`font-semibold ${done ? 'text-ink-muted' : ''}`}>Saison {s.number}</p>
                    <p className="text-xs text-ink-muted">
                      {[s.episodes ? `${s.episodes} épisodes` : null, s.airDate?.slice(0, 4)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </li>
              )
            })}
            {upcoming.map(s => (
              <li key={s.number} className="rounded-3xl flex items-center gap-3 px-4 py-3 border border-dashed border-line">
                <Icon name="clock" size={22} className="text-sable-deep shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">Saison {s.number}</p>
                  <p className="text-xs text-ink-muted">{s.airDate ? `Le ${formatDate(s.airDate)}` : 'Date à venir'}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.overview && (
        <section className="mb-8">
          <h3 className="eyebrow mb-2">Résumé</h3>
          <p className="leading-relaxed">{item.overview}</p>
        </section>
      )}

      <section className="mb-8">
        <h3 className="font-display font-semibold text-lg mb-2">Note et commentaire</h3>
        <div className="flex gap-1 mb-3" role="group" aria-label="Note">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => rate(n)}
              aria-label={`${n} sur 5`}
              aria-pressed={item.rating === n}
              className={`w-12 h-12 rounded-full flex items-center justify-center hover:bg-coconut ${item.rating && n <= item.rating ? 'text-sable-deep' : 'text-ink-muted'}`}
            >
              <Icon name="star" size={30} className={item.rating && n <= item.rating ? 'fill-current' : ''} />
            </button>
          ))}
        </div>
        {commentAuthor && item.comment && item.commentAt && (
          <p className="flex items-center gap-2 text-sm text-ink-muted mb-2">
            <Avatar name={commentAuthor.name} url={commentAuthor.avatarUrl} size={24} />
            {commentAuthor.name} · {formatDate(item.commentAt)}
          </p>
        )}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          onBlur={saveComment}
          rows={3}
          maxLength={2000}
          placeholder="Génial, à revoir…"
          aria-label="Commentaire"
          className="field w-full resize-y"
        />
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-danger"
          onClick={() => (confirmDelete ? startTransition(() => deleteWatch(item.id)) : setConfirmDelete(true))}
          onBlur={() => setConfirmDelete(false)}
        >
          <Icon name="trash" />
          {confirmDelete ? 'Vraiment supprimer ?' : 'Supprimer'}
        </button>
      </div>
    </div>
  )
}
