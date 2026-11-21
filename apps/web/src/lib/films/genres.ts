// Genres des films et séries, en français. TMDB n'a pas les mêmes numéros pour les films
// et les séries (et réunit « Action & Aventure » pour les séries) : on les ramène à une seule liste.

export const GENRES = [
  { id: 'comedie', label: 'Comédie' },
  { id: 'drame', label: 'Drame' },
  { id: 'action', label: 'Action' },
  { id: 'aventure', label: 'Aventure' },
  { id: 'policier', label: 'Policier' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'horreur', label: 'Horreur' },
  { id: 'sf', label: 'Science-fiction' },
  { id: 'fantastique', label: 'Fantastique' },
  { id: 'romance', label: 'Romance' },
  { id: 'animation', label: 'Animation' },
  { id: 'famille', label: 'Famille' },
  { id: 'enfants', label: 'Enfants' },
  { id: 'mystere', label: 'Mystère' },
  { id: 'documentaire', label: 'Documentaire' },
  { id: 'histoire', label: 'Histoire' },
  { id: 'guerre', label: 'Guerre' },
  { id: 'musique', label: 'Musique' },
  { id: 'western', label: 'Western' },
  { id: 'telerealite', label: 'Téléréalité' },
] as const

export type GenreId = (typeof GENRES)[number]['id']

export const GENRE_LABEL = new Map<string, string>(GENRES.map(g => [g.id, g.label]))

const TMDB_GENRES: Record<number, GenreId[]> = {
  28: ['action'], 12: ['aventure'], 16: ['animation'], 35: ['comedie'], 80: ['policier'], 99: ['documentaire'],
  18: ['drame'], 10751: ['famille'], 14: ['fantastique'], 36: ['histoire'], 27: ['horreur'], 10402: ['musique'],
  9648: ['mystere'], 10749: ['romance'], 878: ['sf'], 53: ['thriller'], 10752: ['guerre'], 37: ['western'],
  // Séries
  10759: ['action', 'aventure'], 10762: ['enfants'], 10764: ['telerealite'], 10765: ['sf', 'fantastique'], 10768: ['guerre'],
}

export function genresFromTmdb(ids: number[]): GenreId[] {
  const out: GenreId[] = []
  for (const id of ids) for (const g of TMDB_GENRES[id] ?? []) if (!out.includes(g)) out.push(g)
  return out
}
