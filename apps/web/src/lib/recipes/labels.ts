import type { IconName } from '@/components/ui/Icon'

// Labels d'une recette, en plus de sa catégorie : on peut en cocher plusieurs ; l'icône sert aux filtres et à la fiche.
export const RECIPE_LABELS: readonly { id: string; label: string; code: string; icon: IconName }[] = [
  { id: 'vegetarian', label: 'Végétarien', code: 'vegetarien', icon: 'meatOff' },
  { id: 'vegan', label: 'Végan', code: 'vegan', icon: 'plant' },
  { id: 'lactose-free', label: 'Sans lactose', code: 'sans-lactose', icon: 'milkOff' },
  { id: 'gluten-free', label: 'Sans gluten', code: 'sans-gluten', icon: 'wheatOff' },
  { id: 'light', label: 'Léger', code: 'leger', icon: 'feather' },
  { id: 'comfort', label: 'Réconfortant', code: 'reconfortant', icon: 'flame' },
  { id: 'guests', label: 'Pour recevoir', code: 'pour-recevoir', icon: 'users' },
  { id: 'batch', label: 'Batch cooking', code: 'batch-cooking', icon: 'fridge' },
]

export type RecipeLabelId = (typeof RECIPE_LABELS)[number]['id']

export function isRecipeLabel(value: unknown): value is RecipeLabelId {
  return RECIPE_LABELS.some(l => l.id === value)
}

export function labelName(id: string) {
  return RECIPE_LABELS.find(l => l.id === id)?.label ?? null
}
