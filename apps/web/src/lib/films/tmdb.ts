import { db } from '@/lib/firebase/admin'
import { openSecret, sealSecret } from '@/lib/storage/secrets'
import { STORAGE_SUFFIX } from '@/lib/storage/nas'
import { genresFromTmdb } from '@/lib/films/genres'
import { platformFor } from '@/lib/films/platforms'
import type { WatchItem, WatchKind, WatchProvider, WatchSeason } from '@/types/database'

// TMDB (themoviedb.org) : la base de films et séries gratuite qu'utilisait TV Time.
// La clé (gratuite, compte TMDB) est rangée par foyer : households/{hid}/storage/tmdb, chiffrée ;
// en local, TMDB_API_KEY dans .env.local suffit. Clé « API » (v3, 32 caractères) ou jeton (v4, « eyJ… »).

const API = 'https://api.themoviedb.org/3'
const TIMEOUT_MS = 8000

export class TmdbError extends Error {}

function keyDoc(householdId: string) {
  return db.collection('households').doc(householdId).collection('storage').doc(`tmdb${STORAGE_SUFFIX}`)
}

export async function getTmdbKey(householdId: string): Promise<string | null> {
  const doc = await keyDoc(householdId).get()
  const sealed = doc.data()?.key
  if (typeof sealed === 'string') {
    try {
      return openSecret<string>(sealed, `tmdb:${householdId}`)
    } catch {
      return null
    }
  }
  return process.env.TMDB_API_KEY?.trim() || null
}

export async function saveTmdbKey(householdId: string, uid: string, key: string) {
  await keyDoc(householdId).set({ key: sealSecret(key, `tmdb:${householdId}`), savedBy: uid, savedAt: new Date() })
}

export async function tmdb<T>(key: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API + path)
  url.searchParams.set('language', 'fr-FR')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const bearer = key.startsWith('eyJ')
  if (!bearer) url.searchParams.set('api_key', key)
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...(bearer ? { Authorization: `Bearer ${key}` } : {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  }).catch(() => {
    throw new TmdbError('TMDB ne répond pas.')
  })
  if (res.status === 401) throw new TmdbError('La clé TMDB est refusée.')
  if (!res.ok) throw new TmdbError('TMDB ne répond pas.')
  return res.json() as Promise<T>
}

// Vérifie une clé avant de l'enregistrer
export async function checkTmdbKey(key: string) {
  await tmdb(key, '/configuration')
}

export type Candidate = {
  kind: WatchKind
  tmdbId: number
  title: string
  year: number | null
  posterPath: string | null
  overview: string | null
  popularity: number
}

type SearchResult = {
  id: number
  media_type?: string
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  overview?: string
  popularity?: number
}

function year(date: string | undefined | null) {
  const y = date ? Number(date.slice(0, 4)) : NaN
  return Number.isFinite(y) && y > 1800 ? y : null
}

function toCandidate(r: SearchResult, kind: WatchKind): Candidate {
  return {
    kind,
    tmdbId: r.id,
    title: (kind === 'movie' ? r.title : r.name) ?? '',
    year: year(kind === 'movie' ? r.release_date : r.first_air_date),
    posterPath: r.poster_path ?? null,
    overview: r.overview || null,
    popularity: r.popularity ?? 0,
  }
}

// Films et séries (pas les acteurs) qui répondent à `query`
export async function searchTmdb(key: string, query: string): Promise<(Candidate & { originalTitle: string })[]> {
  const data = await tmdb<{ results: SearchResult[] }>(key, '/search/multi', { query, include_adult: 'false' })
  return data.results
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .map(r => ({ ...toCandidate(r, r.media_type as WatchKind), originalTitle: (r.original_title ?? r.original_name ?? '') }))
    .filter(c => c.title)
}

// Lien IMDb (tt1234567) → la fiche TMDB
export async function findByImdb(key: string, imdbId: string): Promise<Candidate | null> {
  const data = await tmdb<{ movie_results: SearchResult[]; tv_results: SearchResult[] }>(key, `/find/${imdbId}`, { external_source: 'imdb_id' })
  if (data.movie_results[0]) return toCandidate(data.movie_results[0], 'movie')
  if (data.tv_results[0]) return toCandidate(data.tv_results[0], 'tv')
  return null
}

// Ce que TMDB sait d'un film ou d'une série (tout sauf ce qui est à nous)
export type WatchDetails = Pick<WatchItem,
  'kind' | 'tmdbId' | 'title' | 'originalTitle' | 'year' | 'posterPath' | 'overview' | 'genres' | 'runtime' | 'releaseDate'
  | 'seasons' | 'showStatus' | 'nextAirDate' | 'providers' | 'rentable'>

type Providers = { results?: Record<string, { flatrate?: { provider_name: string; logo_path: string | null }[]; rent?: unknown[]; buy?: unknown[] }> }

type Details = SearchResult & {
  genres?: { id: number }[]
  runtime?: number | null
  status?: string
  seasons?: { season_number: number; air_date: string | null; episode_count: number }[]
  next_episode_to_air?: { air_date: string | null; season_number: number; episode_number: number } | null
  release_dates?: { results: { iso_3166_1: string; release_dates: { release_date: string; type: number }[] }[] }
  'watch/providers'?: Providers
}

function providers(data: Providers | undefined): { list: WatchProvider[]; rentable: boolean } {
  const fr = data?.results?.FR
  const list: WatchProvider[] = []
  for (const p of fr?.flatrate ?? []) {
    const platform = platformFor(p.provider_name)
    // Une plateforme a parfois deux entrées (avec ou sans pub) : une seule suffit
    if (platform && list.some(l => l.platform === platform)) continue
    list.push({ platform, name: p.provider_name, logo: p.logo_path })
  }
  return { list, rentable: Boolean(fr?.rent?.length || fr?.buy?.length) }
}

const SHOW_STATUS: Record<string, WatchDetails['showStatus']> = {
  'Returning Series': 'returning', 'In Production': 'planned', Planned: 'planned', Pilot: 'planned', Ended: 'ended', Canceled: 'canceled',
}

export async function fetchDetails(key: string, kind: WatchKind, id: number): Promise<WatchDetails> {
  const append = kind === 'movie' ? 'watch/providers,release_dates' : 'watch/providers'
  const d = await tmdb<Details>(key, `/${kind}/${id}`, { append_to_response: append })
  const { list, rentable } = providers(d['watch/providers'])

  // Sortie en France (cinéma ou plateforme), sinon la date mondiale
  const frDates = d.release_dates?.results.find(r => r.iso_3166_1 === 'FR')?.release_dates ?? []
  const frRelease = frDates.map(r => r.release_date.slice(0, 10)).sort()[0] ?? null

  const seasons: WatchSeason[] = (d.seasons ?? [])
    .filter(s => s.season_number > 0)
    .map(s => ({ number: s.season_number, airDate: s.air_date || null, episodes: s.episode_count ?? 0 }))
    .sort((a, b) => a.number - b.number)
  // Prochaine saison : son premier épisode annoncé
  const next = d.next_episode_to_air
  const nextAirDate = next && next.episode_number === 1 && next.air_date ? next.air_date : null
  if (next && next.episode_number === 1 && !seasons.some(s => s.number === next.season_number)) {
    seasons.push({ number: next.season_number, airDate: next.air_date, episodes: 0 })
  }

  return {
    kind,
    tmdbId: d.id,
    title: (kind === 'movie' ? d.title : d.name) ?? '',
    originalTitle: (kind === 'movie' ? d.original_title : d.original_name) || null,
    year: year(kind === 'movie' ? d.release_date : d.first_air_date),
    posterPath: d.poster_path ?? null,
    overview: d.overview || null,
    genres: genresFromTmdb((d.genres ?? []).map(g => g.id)),
    runtime: kind === 'movie' ? d.runtime || null : null,
    releaseDate: kind === 'movie' ? frRelease ?? d.release_date ?? null : null,
    seasons: kind === 'tv' ? seasons : [],
    showStatus: kind === 'tv' ? SHOW_STATUS[d.status ?? ''] ?? null : null,
    nextAirDate,
    providers: list,
    rentable,
  }
}
