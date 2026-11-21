// Plateformes de streaming connues d'Hestia, reconnues d'après le nom que donne TMDB (en France).
// Le foyer coche les siennes dans Réglages › Films et séries (households/{hid}.watchPlatforms) :
// 'own' = abonnement à part, ou l'id d'une autre plateforme qui l'inclut (« appletv: 'canal' »).
import type { WatchProvider } from '@/types/database'

export type Platform = {
  id: string
  name: string
  // Gratuite (chaînes de télé) : toujours « chez nous »
  free?: boolean
  // Peut être incluse dans une autre (Canal+ inclut Apple TV+, Paramount+, Max dans certaines offres)
  via?: string[]
  match: RegExp
}

export const PLATFORMS: Platform[] = [
  { id: 'netflix', name: 'Netflix', match: /^netflix/i },
  { id: 'prime', name: 'Prime Video', match: /^amazon prime video|^prime video/i },
  { id: 'disney', name: 'Disney+', match: /^disney/i },
  { id: 'canal', name: 'Canal+', match: /^canal\s?\+|^canal plus/i },
  { id: 'appletv', name: 'Apple TV+', via: ['canal'], match: /^apple tv\b/i },
  { id: 'max', name: 'Max', via: ['canal'], match: /^(hbo )?max\b/i },
  { id: 'paramount', name: 'Paramount+', via: ['canal', 'prime'], match: /^paramount\s?(\+|plus)/i },
  { id: 'crunchyroll', name: 'Crunchyroll', match: /^crunchyroll/i },
  { id: 'adn', name: 'ADN', match: /^adn\b|animation digital network/i },
  { id: 'francetv', name: 'france.tv', free: true, match: /^france\.?\s?tv/i },
  { id: 'arte', name: 'Arte', free: true, match: /^arte\b/i },
  { id: 'tf1', name: 'TF1+', free: true, match: /^tf1/i },
  { id: 'm6', name: 'M6+', free: true, match: /^m6|^6play/i },
]

export const PLATFORM_BY_ID = new Map(PLATFORMS.map(p => [p.id, p]))

// 'own' = abonnés ; un id de plateforme = incluse dans celle-là
export type PlatformChoice = 'own' | string
export type PlatformSettings = Record<string, PlatformChoice>

// Noms de TMDB en France (nov. 2026) : « Apple TV » (l'abonnement, ex-Apple TV+), « HBO Max », « Paramount Plus »…
// Pas les options payantes en plus (« Paramount+ Amazon Channel ») ni la location (« Apple TV Store », « Canal VOD »).
export function platformFor(name: string): string | null {
  if (/channel|store|vod/i.test(name)) return null
  return PLATFORMS.find(p => p.match.test(name.trim()))?.id ?? null
}

export function readPlatformSettings(value: unknown): PlatformSettings {
  if (!value || typeof value !== 'object') return {}
  const out: PlatformSettings = {}
  for (const [id, choice] of Object.entries(value as Record<string, unknown>)) {
    const platform = PLATFORM_BY_ID.get(id)
    if (!platform || typeof choice !== 'string') continue
    if (choice === 'own' || platform.via?.includes(choice)) out[id] = choice
  }
  return out
}

export function isOurs(platform: string | null, settings: PlatformSettings) {
  if (!platform) return false
  return Boolean(PLATFORM_BY_ID.get(platform)?.free || settings[platform])
}

// Nos plateformes d'abord, puis les autres
export function sortProviders(providers: WatchProvider[], settings: PlatformSettings) {
  return [...providers].sort((a, b) => Number(isOurs(b.platform, settings)) - Number(isOurs(a.platform, settings)))
}

// « dans votre Canal+ » quand elle est incluse dans un autre abonnement
export function viaLabel(platform: string | null, settings: PlatformSettings): string | null {
  const choice = platform ? settings[platform] : undefined
  if (!choice || choice === 'own') return null
  return `dans votre ${PLATFORM_BY_ID.get(choice)?.name ?? choice}`
}

export function onOurPlatforms(providers: WatchProvider[], settings: PlatformSettings) {
  return providers.some(p => isOurs(p.platform, settings))
}
