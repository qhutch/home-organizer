// Où ranger un film ou une série sur la page Films et séries (sans lecture de la base : sert partout).
import type { WatchItem } from '@/types/database'

export type WatchSection = 'new' | 'watching' | 'towatch' | 'soon' | 'seen'

// Un film arrivé sur nos plateformes reste une nouveauté 30 jours
const ARRIVAL_DAYS = 30

export function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
}

type Item = Pick<WatchItem, 'kind' | 'status' | 'seasons' | 'seasonsWatched' | 'progressAt' | 'arrivedAt' | 'releaseDate' | 'nextAirDate' | 'showStatus'>

export function airedSeasons(item: Pick<WatchItem, 'seasons'>, day = today()) {
  return item.seasons.filter(s => s.airDate && s.airDate <= day)
}

function recentlyArrived(item: Item) {
  return Boolean(item.arrivedAt && Date.now() - new Date(item.arrivedAt).getTime() < ARRIVAL_DAYS * 86_400_000)
}

// La première saison pas encore vue est sortie après la dernière saison cochée
export function hasNewSeason(item: Item, day = today()) {
  if (item.kind !== 'tv' || item.seasonsWatched === 0) return false
  const next = airedSeasons(item, day).find(s => s.number === item.seasonsWatched + 1)
  if (!next?.airDate) return false
  return !item.progressAt || next.airDate > item.progressAt.slice(0, 10)
}

export function sectionOf(item: Item, day = today()): WatchSection {
  if (item.kind === 'movie') {
    if (item.status === 'done') return 'seen'
    if (item.releaseDate && item.releaseDate > day) return 'soon'
    return recentlyArrived(item) ? 'new' : 'towatch'
  }
  const aired = airedSeasons(item, day).length
  if (item.seasonsWatched === 0) {
    if (aired === 0) return 'soon'
    return recentlyArrived(item) ? 'new' : 'towatch'
  }
  if (item.seasonsWatched < aired) return hasNewSeason(item, day) ? 'new' : 'watching'
  return item.nextAirDate && item.nextAirDate > day ? 'soon' : 'seen'
}

export function isNews(item: Item, day = today()) {
  return sectionOf(item, day) === 'new'
}

// Date lisible : « 12 mars 2027 »
export function formatDate(day: string) {
  return new Date(`${day.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Petite ligne sous le titre d'une carte
export function watchDetail(item: WatchItem, day = today()): string {
  const section = sectionOf(item, day)
  if (item.kind === 'movie') {
    if (section === 'soon' && item.releaseDate) return `Sortie le ${formatDate(item.releaseDate)}`
    if (section === 'seen' && item.watchedAt) return `Vu le ${formatDate(item.watchedAt)}`
    if (section === 'new') return 'Film · nouveau chez vous'
    return ['Film', item.year].filter(Boolean).join(' · ')
  }
  const aired = airedSeasons(item, day).length
  if (section === 'new') {
    return item.seasonsWatched === 0 ? 'Série · nouveau chez vous' : `Saison ${item.seasonsWatched + 1} disponible`
  }
  if (section === 'watching') return `Série · ${item.seasonsWatched} saison${item.seasonsWatched > 1 ? 's' : ''} sur ${aired}`
  if (section === 'soon') {
    const next = item.seasons.find(s => s.number === aired + 1)
    const when = item.nextAirDate ?? next?.airDate
    return `Saison ${aired + 1}${when ? ` le ${formatDate(when)}` : ''}`
  }
  if (section === 'seen') return item.showStatus === 'ended' || item.showStatus === 'canceled' ? 'Série terminée · tout vu' : 'À jour'
  return ['Série', aired ? `${aired} saison${aired > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')
}
