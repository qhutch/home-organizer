// Affiches et logos servis par TMDB (pas de clé nécessaire pour les images)
const IMAGE = 'https://image.tmdb.org/t/p'

export function posterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' = 'w342') {
  return path ? `${IMAGE}/${size}${path}` : null
}

export function logoUrl(path: string | null) {
  return path ? `${IMAGE}/w92${path}` : null
}
