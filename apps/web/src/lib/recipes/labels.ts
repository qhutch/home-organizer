// Labels d'une recette, en plus de sa catégorie : on peut en cocher plusieurs.
export const RECIPE_LABELS = [
  { id: 'vegetarian', label: 'Végétarien', code: 'vegetarien' },
  { id: 'vegan', label: 'Végan', code: 'vegan' },
  { id: 'lactose-free', label: 'Sans lactose', code: 'sans-lactose' },
  { id: 'gluten-free', label: 'Sans gluten', code: 'sans-gluten' },
  { id: 'light', label: 'Léger', code: 'leger' },
  { id: 'comfort', label: 'Réconfortant', code: 'reconfortant' },
  { id: 'guests', label: 'Pour recevoir', code: 'pour-recevoir' },
  { id: 'batch', label: 'Batch cooking', code: 'batch-cooking' },
] as const

export type RecipeLabelId = (typeof RECIPE_LABELS)[number]['id']

export function isRecipeLabel(value: unknown): value is RecipeLabelId {
  return RECIPE_LABELS.some(l => l.id === value)
}

export function labelName(id: string) {
  return RECIPE_LABELS.find(l => l.id === id)?.label ?? null
}
