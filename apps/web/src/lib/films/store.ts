import { after } from 'next/server'
import { db } from '@/lib/firebase/admin'
import { avatarUrl } from '@/lib/avatar'
import { fetchDetails, getTmdbKey, type WatchDetails } from '@/lib/films/tmdb'
import { onOurPlatforms, readPlatformSettings, type PlatformSettings } from '@/lib/films/platforms'
import { isNews } from '@/lib/films/state'
import type { WatchItem, WatchKind, WatchProvider, WatchSeason, WatchStatus } from '@/types/database'

// Films et séries du foyer : households/{hid}/watchItems/{id}, plus households/{hid}/watchMeta/state
// (date du dernier rafraîchissement depuis TMDB). `isNews` est gardé dans chaque document pour que
// l'accueil ne lise que les nouveautés (quota Firestore).

const STATUSES: WatchStatus[] = ['towatch', 'watching', 'done']
const SHOW_STATUSES = ['returning', 'ended', 'canceled', 'planned'] as const

export function watchCollection(householdId: string) {
  return db.collection('households').doc(householdId).collection('watchItems')
}

function iso(value: unknown): string | null {
  const v = value as { toDate?: () => Date } | string | null | undefined
  if (typeof v === 'string') return v
  return v?.toDate?.().toISOString() ?? null
}

function str(value: unknown) {
  return typeof value === 'string' && value ? value : null
}

export function toWatchItem(doc: FirebaseFirestore.DocumentSnapshot): WatchItem {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    kind: d.kind === 'tv' ? 'tv' : 'movie',
    tmdbId: Number(d.tmdbId) || 0,
    title: str(d.title) ?? '',
    originalTitle: str(d.originalTitle),
    year: typeof d.year === 'number' ? d.year : null,
    posterPath: str(d.posterPath),
    overview: str(d.overview),
    genres: Array.isArray(d.genres) ? d.genres.filter((g: unknown): g is string => typeof g === 'string') : [],
    runtime: typeof d.runtime === 'number' ? d.runtime : null,
    releaseDate: str(d.releaseDate),
    seasons: Array.isArray(d.seasons)
      ? d.seasons
        .filter((s: unknown): s is WatchSeason => !!s && typeof (s as WatchSeason).number === 'number')
        .map((s: WatchSeason) => ({ number: s.number, airDate: str(s.airDate), episodes: Number(s.episodes) || 0 }))
      : [],
    showStatus: SHOW_STATUSES.includes(d.showStatus) ? d.showStatus : null,
    nextAirDate: str(d.nextAirDate),
    providers: Array.isArray(d.providers)
      ? d.providers
        .filter((p: unknown): p is WatchProvider => !!p && typeof (p as WatchProvider).name === 'string')
        .map((p: WatchProvider) => ({ platform: str(p.platform), name: p.name, logo: str(p.logo) }))
      : [],
    rentable: Boolean(d.rentable),
    owner: str(d.owner),
    status: STATUSES.includes(d.status) ? d.status : 'towatch',
    seasonsWatched: typeof d.seasonsWatched === 'number' ? d.seasonsWatched : 0,
    progressAt: iso(d.progressAt),
    watchedAt: iso(d.watchedAt),
    arrivedAt: iso(d.arrivedAt),
    rating: typeof d.rating === 'number' ? d.rating : null,
    comment: str(d.comment),
    commentBy: str(d.commentBy),
    commentAt: iso(d.commentAt),
    sourceUrl: str(d.sourceUrl),
    addedBy: str(d.addedBy) ?? '',
    createdAt: iso(d.createdAt) ?? '',
  }
}

export type WatchMember = { name: string; avatarUrl: string | null }

// Les membres du foyer (prénom, photo) : qui a ajouté un film, qui a écrit le commentaire
export async function getWatchMembers(householdId: string): Promise<Record<string, WatchMember>> {
  const members = await db.collection('households').doc(householdId).collection('members').get()
  const profiles = await Promise.all(members.docs.map(m => db.collection('userProfiles').doc(m.id).get()))
  return Object.fromEntries(members.docs.map((m, i) => {
    const p = profiles[i].data() ?? {}
    return [m.id, { name: (p.displayName as string) || 'Quelqu’un du foyer', avatarUrl: avatarUrl(m.id, p.avatarVersion as number | undefined) }]
  }))
}

export async function getPlatformSettings(householdId: string): Promise<PlatformSettings> {
  const doc = await db.collection('households').doc(householdId).get()
  return readPlatformSettings(doc.data()?.watchPlatforms)
}

// Ce qu'un membre voit : Ensemble, et son « Moi » (jamais celui de l'autre)
export function visibleTo(item: Pick<WatchItem, 'owner'>, uid: string) {
  return item.owner === null || item.owner === uid
}

export function tmdbKeyOf(kind: WatchKind, id: number) {
  return `${kind}:${id}`
}

// Champs d'un document à réécrire après un changement (TMDB ou nous) : la nouveauté se recalcule
export function newsField(item: WatchItem) {
  return { isNews: isNews(item) }
}

// Les infos de TMDB plaquées sur un film déjà là : il vient d'arriver chez nous s'il n'y était pas
export function mergeDetails(item: WatchItem, details: WatchDetails, settings: PlatformSettings) {
  const wasOurs = onOurPlatforms(item.providers, settings)
  const nowOurs = onOurPlatforms(details.providers, settings)
  const arrivedAt = !wasOurs && nowOurs && item.status === 'towatch' && item.seasonsWatched === 0 ? new Date().toISOString() : item.arrivedAt
  const next: WatchItem = { ...item, ...details, arrivedAt }
  return { next, patch: { ...details, arrivedAt, refreshedAt: new Date(), ...newsField(next) } }
}

const REFRESH_EVERY_MS = 20 * 3600_000
const ITEM_STALE_MS = 3 * 86_400_000
const MAX_PER_RUN = 60

// Une fois par jour au plus : les séries pas finies et ce qui reste à voir reprennent les infos de TMDB
// (nouvelle saison, plateformes). Lancé après la réponse (accueil, page Films), sans la ralentir.
export function refreshLater(householdId: string) {
  after(() => refreshWatch(householdId).catch(error => console.error('Films : rafraîchissement raté', error)))
}

export async function refreshWatch(householdId: string, { force = false } = {}) {
  const metaRef = db.collection('households').doc(householdId).collection('watchMeta').doc('state')
  const meta = await metaRef.get()
  const last = iso(meta.data()?.refreshedAt)
  if (!force && last && Date.now() - new Date(last).getTime() < REFRESH_EVERY_MS) return
  const key = await getTmdbKey(householdId)
  if (!key) return
  await metaRef.set({ refreshedAt: new Date() }, { merge: true })

  const [snapshot, settings] = await Promise.all([watchCollection(householdId).get(), getPlatformSettings(householdId)])
  const stale = snapshot.docs
    .filter(doc => {
      const item = toWatchItem(doc)
      const finished = item.kind === 'movie' ? item.status === 'done' : item.showStatus === 'ended' || item.showStatus === 'canceled'
      const refreshed = iso(doc.data().refreshedAt)
      const old = !refreshed || Date.now() - new Date(refreshed).getTime() > ITEM_STALE_MS
      // Fini (film vu, série terminée) : plus rien ne bouge. Série en cours : chaque jour. Le reste : tous les 3 jours.
      if (finished) return !refreshed
      return item.kind === 'tv' || old
    })
    .slice(0, MAX_PER_RUN)

  for (let i = 0; i < stale.length; i += 5) {
    await Promise.all(stale.slice(i, i + 5).map(async doc => {
      const item = toWatchItem(doc)
      try {
        const details = await fetchDetails(key, item.kind, item.tmdbId)
        const { patch } = mergeDetails(item, details, settings)
        await doc.ref.update(patch)
      } catch {
        // TMDB ne répond pas pour celui-là : on réessaiera
      }
    }))
  }

  // Le temps passe : une saison annoncée peut être sortie sans que TMDB ait changé
  for (const doc of snapshot.docs) {
    if (stale.includes(doc)) continue
    const item = toWatchItem(doc)
    const news = isNews(item)
    if (news !== Boolean(doc.data().isNews)) await doc.ref.update({ isNews: news })
  }
}
