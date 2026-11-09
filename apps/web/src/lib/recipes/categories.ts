import type { IconName } from '@/components/ui/Icon'

// Catégories de recettes, dans l'ordre des filtres de la bibliothèque ;
// l'icône (nom d'Icon) remplace la photo sur la carte d'une recette qui n'en a pas.
export const RECIPE_CATEGORIES = [
  { id: 'starter', label: 'Entrées', icon: 'salad' },
  { id: 'main', label: 'Plats', icon: 'soup' },
  { id: 'dessert', label: 'Desserts', icon: 'cookie' },
  { id: 'aperitif', label: 'Apéro', icon: 'wine' },
  { id: 'breakfast', label: 'Petit-déj', icon: 'coffee' },
  { id: 'drink', label: 'Boissons', icon: 'cup' },
] as const

export type RecipeCategoryId = (typeof RECIPE_CATEGORIES)[number]['id']

export function isRecipeCategory(value: unknown): value is RecipeCategoryId {
  return RECIPE_CATEGORIES.some(c => c.id === value)
}

export function categoryLabel(id: string | null) {
  return RECIPE_CATEGORIES.find(c => c.id === id)?.label ?? null
}

export function categoryIcon(id: string | null): IconName {
  return RECIPE_CATEGORIES.find(c => c.id === id)?.icon ?? 'recipes'
}
