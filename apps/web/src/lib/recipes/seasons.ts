import type { RecipeIngredient } from '@/types/database'

// Saisons qu'on coche sur une recette (plusieurs possibles ; les quatre = toute l'année).
export const SEASONS = [
  { id: 'spring', label: 'Printemps', code: 'printemps', months: [3, 4, 5] },
  { id: 'summer', label: 'Été', code: 'ete', months: [6, 7, 8] },
  { id: 'autumn', label: 'Automne', code: 'automne', months: [9, 10, 11] },
  { id: 'winter', label: 'Hiver', code: 'hiver', months: [12, 1, 2] },
] as const

export type SeasonId = (typeof SEASONS)[number]['id']

export function isSeason(value: unknown): value is SeasonId {
  return SEASONS.some(s => s.id === value)
}

// month : de 1 à 12
export function seasonOfMonth(month: number): SeasonId {
  return SEASONS.find(s => (s.months as readonly number[]).includes(month))!.id
}

export function seasonsLabel(ids: string[]) {
  if (ids.length === SEASONS.length) return 'Toute l’année'
  return SEASONS.filter(s => ids.includes(s.id)).map(s => s.label).join(', ')
}

// Fruits et légumes de saison en France (mois de 1 à 12). Les produits de toute l'année
// (carotte, oignon, pomme de terre…) n'y sont pas : ils ne disent rien de la saison.
const PRODUCE: { pattern: RegExp; months: number[] }[] = [
  { pattern: /\b(courges?|potirons?|potimarrons?|butternuts?|citrouilles?)\b/, months: [9, 10, 11, 12, 1, 2] },
  { pattern: /\bpoireaux?\b/, months: [9, 10, 11, 12, 1, 2, 3, 4] },
  { pattern: /\bchoux?\b(?![- ]fleur)/, months: [10, 11, 12, 1, 2, 3] },
  { pattern: /\bchoux?[- ]fleurs?\b/, months: [9, 10, 11, 12, 1, 2, 3, 4] },
  { pattern: /\bbrocolis?\b/, months: [6, 7, 8, 9, 10, 11] },
  { pattern: /\btomates?\b/, months: [6, 7, 8, 9] },
  { pattern: /\bcourgettes?\b/, months: [6, 7, 8, 9] },
  { pattern: /\baubergines?\b/, months: [6, 7, 8, 9] },
  { pattern: /\bpoivrons?\b/, months: [6, 7, 8, 9] },
  { pattern: /\bconcombres?\b/, months: [5, 6, 7, 8, 9] },
  { pattern: /\bharicots? verts?\b/, months: [6, 7, 8, 9] },
  { pattern: /\bpetits? pois\b/, months: [5, 6, 7] },
  { pattern: /\basperges?\b/, months: [4, 5, 6] },
  { pattern: /\bartichauts?\b/, months: [5, 6, 7, 8, 9] },
  { pattern: /\bradis\b/, months: [4, 5, 6] },
  { pattern: /\bfenouils?\b/, months: [6, 7, 8, 9, 10] },
  { pattern: /\bepinards?\b/, months: [3, 4, 5, 9, 10, 11] },
  { pattern: /\bendives?\b/, months: [10, 11, 12, 1, 2, 3, 4] },
  { pattern: /\bmache\b/, months: [10, 11, 12, 1, 2, 3] },
  { pattern: /\bchampignons?\b/, months: [9, 10, 11] },
  { pattern: /\b(chataignes?|marrons?)\b/, months: [10, 11, 12] },
  { pattern: /\bbetteraves?\b/, months: [9, 10, 11, 12, 1, 2, 3] },
  { pattern: /\bpanais\b/, months: [10, 11, 12, 1, 2, 3] },
  { pattern: /\btopinambours?\b/, months: [10, 11, 12, 1, 2, 3] },
  { pattern: /\bnavets?\b/, months: [10, 11, 12, 1, 2, 3] },
  { pattern: /\bceleris?\b/, months: [9, 10, 11, 12, 1, 2, 3] },
  { pattern: /\bpommes?\b(?! de terre)/, months: [9, 10, 11, 12, 1, 2, 3] },
  { pattern: /\bpoires?\b/, months: [9, 10, 11, 12, 1] },
  { pattern: /\braisins?\b(?! secs?)/, months: [9, 10] },
  { pattern: /\bfigues?\b/, months: [8, 9, 10] },
  { pattern: /\bprunes?\b/, months: [7, 8, 9] },
  { pattern: /\bmirabelles?\b/, months: [8, 9] },
  { pattern: /\bfraises?\b/, months: [5, 6, 7] },
  { pattern: /\bframboises?\b/, months: [6, 7, 8, 9] },
  { pattern: /\bmyrtilles?\b/, months: [7, 8, 9] },
  { pattern: /\bcerises?\b/, months: [6, 7] },
  { pattern: /\babricots?\b/, months: [6, 7, 8] },
  { pattern: /\b(peches?|nectarines?)\b/, months: [6, 7, 8, 9] },
  { pattern: /\bmelons?\b/, months: [6, 7, 8, 9] },
  { pattern: /\brhubarbes?\b/, months: [4, 5, 6] },
  { pattern: /\b(clementines?|mandarines?)\b/, months: [11, 12, 1, 2] },
  { pattern: /\boranges?\b/, months: [12, 1, 2, 3] },
  { pattern: /\bkiwis?\b/, months: [11, 12, 1, 2, 3, 4] },
]

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Mois où tous les produits de saison de la recette le sont en même temps.
// null : aucun produit de saison dans la recette (elle se fait toute l'année).
export function recipeSeasonMonths(ingredients: RecipeIngredient[]): number[] | null {
  let months: number[] | null = null
  for (const ingredient of ingredients) {
    const name = normalize(ingredient.name)
    for (const produce of PRODUCE) {
      if (!produce.pattern.test(name)) continue
      months = months ? months.filter(m => produce.months.includes(m)) : [...produce.months]
    }
  }
  return months
}

// month : de 1 à 12
export function isInSeason(ingredients: RecipeIngredient[], month: number) {
  return recipeSeasonMonths(ingredients)?.includes(month) ?? false
}

// Saisons proposées d'après les ingrédients ; aucun produit de saison = toute l'année.
export function guessSeasons(ingredients: RecipeIngredient[]): SeasonId[] {
  const months = recipeSeasonMonths(ingredients)
  if (!months) return SEASONS.map(s => s.id)
  return SEASONS.filter(s => s.months.some(m => months.includes(m))).map(s => s.id)
}

// Une recette est de saison si sa saison cochée est celle du mois ;
// sans saison cochée (anciennes recettes), on la devine d'après ses ingrédients.
export function isRecipeInSeason(recipe: { seasons: string[]; ingredients: RecipeIngredient[] }, month: number) {
  if (recipe.seasons.length) return recipe.seasons.includes(seasonOfMonth(month))
  return isInSeason(recipe.ingredients, month)
}
