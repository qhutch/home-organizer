export type ShoppingItem = {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  notes: string | null
  // Rayon du magasin (id de AISLES dans lib/shopping/catalog.ts)
  category: string | null
  // Emoji choisi à la main (nom d'un fichier de public/emoji) ; null = celui du catalogue
  emoji: string | null
  inList: boolean
  addedBy: string
  createdAt: string
  // Dernier ajout, achat ou modification : sert à trier les récents
  updatedAt: string
}

export type Household = {
  id: string
  name: string
  createdAt: string
}

export type HouseholdMember = {
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
}

export type Profile = {
  id: string
  displayName: string | null
  avatarUrl: string | null
  updatedAt: string
}

export type RecipeIngredient = {
  name: string
  quantity: number | null
  unit: string | null
}

export type Recipe = {
  id: string
  title: string
  // Catégorie (id de RECIPE_CATEGORIES dans lib/recipes/categories.ts)
  category: string | null
  // Labels (ids de RECIPE_LABELS dans lib/recipes/labels.ts) : végétarien, sans lactose…
  labels: string[]
  // Saisons cochées (ids de SEASONS dans lib/recipes/seasons.ts) ; les quatre = toute l'année
  seasons: string[]
  favorite: boolean
  // Note de 1 à 5 ; null = pas encore notée
  rating: number | null
  // Notre avis après l'avoir cuisinée (texte libre) ; null = pas de commentaire
  comment: string | null
  // Qui a écrit le commentaire (uid) ; null = pas de commentaire
  commentBy: string | null
  // Date du commentaire (ISO) ; null = pas de commentaire
  commentAt: string | null
  // Minutes ; null = inconnu
  prepMinutes: number | null
  cookMinutes: number | null
  servings: number
  ingredients: RecipeIngredient[]
  steps: string[]
  // Lien vers la recette d'origine (Instagram, site…)
  sourceUrl: string | null
  // Photo principale (id dans la sous-collection photos) ; null = pas de photo
  coverPhotoId: string | null
  addedBy: string
  createdAt: string
  updatedAt: string
}

// Photo d'une recette : le fichier est servi par /api/recipes/{id}/photos/{photoId}
export type RecipePhoto = {
  id: string
  addedBy: string
  createdAt: string
}
