// Catégories de recettes, dans l'ordre des filtres de la bibliothèque.
export const RECIPE_CATEGORIES = [
  { id: 'starter', label: 'Entrées' },
  { id: 'main', label: 'Plats' },
  { id: 'dessert', label: 'Desserts' },
  { id: 'aperitif', label: 'Apéro' },
  { id: 'breakfast', label: 'Petit-déj' },
  { id: 'drink', label: 'Boissons' },
] as const

export type RecipeCategoryId = (typeof RECIPE_CATEGORIES)[number]['id']

export function isRecipeCategory(value: unknown): value is RecipeCategoryId {
  return RECIPE_CATEGORIES.some(c => c.id === value)
}

export function categoryLabel(id: string | null) {
  return RECIPE_CATEGORIES.find(c => c.id === id)?.label ?? null
}
