'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { LinkError } from '@/lib/recipes/from-link'
import { readLink, type LinkPost } from '@/lib/films/from-link'
import { checkTmdbKey, fetchDetails, findByImdb, getTmdbKey, saveTmdbKey, searchTmdb, TmdbError, type Candidate, type WatchDetails } from '@/lib/films/tmdb'
import { getPlatformSettings, getWatchMembers, newsField, refreshLater, tmdbKeyOf, toWatchItem, visibleTo, watchCollection } from '@/lib/films/store'
import { airedSeasons } from '@/lib/films/state'
import { readPlatformSettings, type PlatformSettings } from '@/lib/films/platforms'
import type { WatchItem, WatchKind, WatchStatus } from '@/types/database'

async function filmsContext() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  return { user, householdId: membership.householdId, collection: watchCollection(membership.householdId) }
}

export async function getWatchList() {
  const { user, householdId, collection } = await filmsContext()
  const [snapshot, settings, key, members] = await Promise.all([collection.get(), getPlatformSettings(householdId), getTmdbKey(householdId), getWatchMembers(householdId)])
  refreshLater(householdId)
  const items = snapshot.docs.map(toWatchItem).filter(item => visibleTo(item, user.uid))
  return { items, settings, hasKey: Boolean(key), uid: user.uid, members }
}

export async function getWatch(id: string) {
  const { user, householdId, collection } = await filmsContext()
  const [doc, settings, members] = await Promise.all([collection.doc(id).get(), getPlatformSettings(householdId), getWatchMembers(householdId)])
  if (!doc.exists) return null
  const item = toWatchItem(doc)
  if (!visibleTo(item, user.uid)) return null
  return { item, settings, uid: user.uid, members }
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Un lien (Instagram, IMDb, TMDB, Netflix…) ou un titre tapé → films et séries possibles, le plus probable d'abord
// `sure` : le titre trouvé est exactement l'un de ceux devinés (sinon on demande le titre, avec le post sous les yeux)
export async function findWatch(input: string): Promise<{ candidates: Candidate[]; sure: boolean; post?: LinkPost; error?: string }> {
  const { householdId } = await filmsContext()
  const key = await getTmdbKey(householdId)
  if (!key) return { candidates: [], sure: false, error: 'Il manque la clé TMDB (Réglages › Films et séries).' }
  const text = input.trim().slice(0, 500)
  if (!text) return { candidates: [], sure: false }

  try {
    let queries = [text]
    let post: LinkPost | undefined
    const isLink = /^https?:\/\//i.test(text)
    if (isLink) {
      const clues = await readLink(text)
      if ('tmdb' in clues) {
        const d = await fetchDetails(key, clues.tmdb.kind, clues.tmdb.id)
        return { sure: true, candidates: [{ kind: d.kind, tmdbId: d.tmdbId, title: d.title, year: d.year, posterPath: d.posterPath, overview: d.overview, popularity: 0 }] }
      }
      if ('imdb' in clues) {
        const found = await findByImdb(key, clues.imdb)
        if (found) return { candidates: [found], sure: true }
        return { candidates: [], sure: false, error: 'Aucun film ni série trouvé avec ce lien.' }
      }
      queries = clues.queries
      post = clues.post
      if (!queries.length) return { candidates: [], sure: false, post }
    }

    // Chaque titre possible est cherché ; un titre identique à ce qu'on cherche passe devant
    const scored = new Map<string, { candidate: Candidate; score: number; exact: boolean }>()
    const results = await Promise.all(queries.map(q => searchTmdb(key, q).catch(() => [])))
    results.forEach((list, qi) => {
      const wanted = normalize(queries[qi])
      list.slice(0, 8).forEach((c, rank) => {
        const exact = normalize(c.title) === wanted || normalize(c.originalTitle) === wanted
        const score = (exact ? 100 : 0) + (queries.length - qi) * 10 - rank * 3 + Math.log10(1 + c.popularity) * 5 + (c.posterPath ? 2 : 0)
        const id = tmdbKeyOf(c.kind, c.tmdbId)
        const best = scored.get(id)
        if (!best || best.score < score) scored.set(id, { candidate: c, score: (best?.score ?? 0) / 4 + score, exact: exact || Boolean(best?.exact) })
      })
    })
    const ranked = [...scored.values()].sort((a, b) => b.score - a.score).slice(0, 8)
    const candidates = ranked.map(s => s.candidate)
    // Un titre tapé : on fait confiance à TMDB. Un lien : seulement si un titre deviné correspond exactement.
    const sure = Boolean(ranked[0]) && (!isLink || ranked[0].exact)
    if (!candidates.length && !post) return { candidates, sure, error: 'Rien trouvé. Essaie avec le titre.' }
    return { candidates, sure, post }
  } catch (error) {
    if (error instanceof LinkError || error instanceof TmdbError) return { candidates: [], sure: false, error: error.message }
    console.error('Films : recherche ratée', error)
    return { candidates: [], sure: false, error: 'La recherche n’a pas marché.' }
  }
}

export type WatchPreview = {
  details: WatchDetails
  // Déjà dans la liste commune ou dans « Moi » : on l'ouvre plutôt que de l'ajouter deux fois
  existingId: string | null
  // « Quentin l'a vue · saison 3 » : l'autre la connaît, dans son « Moi »
  others: string[]
}

function progressLabel(name: string, item: WatchItem) {
  if (item.kind === 'movie') return item.status === 'done' ? `${name} l’a vu` : `${name} veut le voir`
  const aired = airedSeasons(item).length
  if (item.seasonsWatched === 0) return `${name} veut la voir`
  if (item.seasonsWatched >= aired) return `${name} l’a vue en entier`
  return `${name} la regarde · saison ${item.seasonsWatched} vue`
}

export async function previewWatch(kind: WatchKind, tmdbId: number): Promise<WatchPreview | { error: string }> {
  const { user, householdId, collection } = await filmsContext()
  const key = await getTmdbKey(householdId)
  if (!key) return { error: 'Il manque la clé TMDB.' }
  try {
    const [details, same] = await Promise.all([
      fetchDetails(key, kind, tmdbId),
      collection.where('tmdbKey', '==', tmdbKeyOf(kind, tmdbId)).get(),
    ])
    const items = same.docs.map(toWatchItem)
    const mine = items.find(i => visibleTo(i, user.uid))
    const theirs = items.filter(i => i.owner && i.owner !== user.uid)
    const names = await Promise.all(theirs.map(i => db.collection('userProfiles').doc(i.owner!).get().then(d => (d.data()?.displayName as string) || 'L’autre')))
    return { details, existingId: mine?.id ?? null, others: theirs.map((i, n) => progressLabel(names[n], i)) }
  } catch (error) {
    return { error: error instanceof TmdbError ? error.message : 'TMDB ne répond pas.' }
  }
}

export async function addWatch(input: { kind: WatchKind; tmdbId: number; forMe: boolean; seen: boolean; sourceUrl: string | null }): Promise<{ id: string } | { error: string }> {
  const { user, householdId, collection } = await filmsContext()
  const key = await getTmdbKey(householdId)
  if (!key) return { error: 'Il manque la clé TMDB.' }
  const tmdbKey = tmdbKeyOf(input.kind, input.tmdbId)
  const owner = input.forMe ? user.uid : null

  const same = await collection.where('tmdbKey', '==', tmdbKey).get()
  const existing = same.docs.map(toWatchItem).find(i => i.owner === owner)
  if (existing) return { id: existing.id }

  let details: WatchDetails
  try {
    details = await fetchDetails(key, input.kind, input.tmdbId)
  } catch (error) {
    return { error: error instanceof TmdbError ? error.message : 'TMDB ne répond pas.' }
  }
  const now = new Date()
  const aired = input.kind === 'tv' ? airedSeasons(details).length : 0
  const status: WatchStatus = input.seen ? (input.kind === 'movie' ? 'done' : 'watching') : 'towatch'
  const sourceUrl = input.sourceUrl && /^https?:\/\//i.test(input.sourceUrl) ? input.sourceUrl.slice(0, 500) : null
  const item: Omit<WatchItem, 'id'> = {
    ...details,
    owner,
    status,
    seasonsWatched: input.seen ? aired : 0,
    progressAt: input.seen && input.kind === 'tv' ? now.toISOString() : null,
    watchedAt: input.seen && input.kind === 'movie' ? now.toISOString() : null,
    arrivedAt: null,
    rating: null,
    comment: null,
    commentBy: null,
    commentAt: null,
    sourceUrl,
    addedBy: user.uid,
    createdAt: now.toISOString(),
  }
  const ref = await collection.add({
    ...item,
    tmdbKey,
    progressAt: item.progressAt ? now : null,
    watchedAt: item.watchedAt ? now : null,
    createdAt: FieldValue.serverTimestamp(),
    refreshedAt: now,
    ...newsField({ ...item, id: '' }),
  })
  revalidatePath('/films')
  return { id: ref.id }
}

async function ownItem(id: string) {
  const { user, householdId, collection } = await filmsContext()
  const ref = collection.doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  const item = toWatchItem(doc)
  if (!visibleTo(item, user.uid)) return null
  return { user, householdId, ref, item }
}

// Ensemble / Moi, film vu ou pas, saisons vues
export async function updateWatch(id: string, patch: { forMe?: boolean; seen?: boolean; seasonsWatched?: number }) {
  const found = await ownItem(id)
  if (!found) return
  const { user, ref, item } = found
  const update: Record<string, unknown> = {}
  const next: WatchItem = { ...item }

  if (patch.forMe !== undefined) next.owner = update.owner = patch.forMe ? user.uid : null
  if (patch.seen !== undefined && item.kind === 'movie') {
    next.status = update.status = patch.seen ? 'done' : 'towatch'
    const at = patch.seen ? new Date() : null
    update.watchedAt = at
    next.watchedAt = at?.toISOString() ?? null
  }
  if (patch.seasonsWatched !== undefined && item.kind === 'tv') {
    const n = Math.max(0, Math.min(airedSeasons(item).length, Math.round(patch.seasonsWatched)))
    next.seasonsWatched = update.seasonsWatched = n
    next.status = update.status = n > 0 ? 'watching' : 'towatch'
    const now = new Date()
    update.progressAt = n > 0 ? now : null
    next.progressAt = n > 0 ? now.toISOString() : null
  }
  if (!Object.keys(update).length) return
  await ref.update({ ...update, ...newsField(next), updatedAt: FieldValue.serverTimestamp() })
  revalidatePath('/films')
}

export async function setWatchReview(id: string, review: { rating: number | null; comment: string }) {
  const found = await ownItem(id)
  if (!found) return
  const rating = review.rating && review.rating >= 1 && review.rating <= 5 ? Math.round(review.rating) : null
  const comment = review.comment.trim().slice(0, 2000) || null
  const changed = comment !== found.item.comment
  await found.ref.update({
    rating,
    comment,
    ...(changed ? { commentBy: comment ? found.user.uid : null, commentAt: comment ? new Date() : null } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  })
  revalidatePath(`/films/${id}`)
}

export async function deleteWatch(id: string) {
  const found = await ownItem(id)
  if (!found) return
  await found.ref.delete()
  revalidatePath('/films')
  redirect('/films')
}

// Réglages › Films et séries

export async function saveTmdbKeyAction(raw: string): Promise<{ error?: string }> {
  const { user, householdId } = await filmsContext()
  const key = raw.trim()
  if (!/^[a-f0-9]{32}$/i.test(key) && !/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(key)) return { error: 'Ce n’est pas une clé TMDB.' }
  try {
    await checkTmdbKey(key)
  } catch (error) {
    return { error: error instanceof TmdbError ? error.message : 'TMDB ne répond pas.' }
  }
  await saveTmdbKey(householdId, user.uid, key)
  revalidatePath('/settings')
  revalidatePath('/films')
  return {}
}

export async function saveWatchPlatforms(settings: PlatformSettings) {
  const { householdId } = await filmsContext()
  await db.collection('households').doc(householdId).update({ watchPlatforms: readPlatformSettings(settings) })
  revalidatePath('/films')
}
