import { findCatalogEntry, itemKey } from '@/lib/shopping/catalog'
import { formatQuantity, isPantryStaple, scaleIngredients } from '@/lib/recipes/ingredients'
import type { Recipe, RecipeIngredient } from '@/types/database'

// Batch cooking : on choisit plusieurs recettes pour la semaine, l'app propose celles qui partagent
// des ingrédients (riz, poireaux…) pour les préparer en une seule fois.

// Morceau devant le produit : « Dos de cabillaud », « filets de cabillaud » → cabillaud
const CUT = /^\s*(filets?|dos|pav[ée]s?|morceaux?|tranches?|darnes?|longes?|escalopes?|cuisses?|blancs?|steaks?)\s+(de|d['’])\s*/i

// Un même produit, quelle que soit la façon de l'écrire : « 2 poireaux émincés » et « Poireau » → Poireaux.
// Un nom inconnu du catalogue est réessayé sans son morceau (« Pavés de thon », connu, reste à part du thon en boîte).
function productOf(name: string) {
  const entry = findCatalogEntry(name)
  if (entry) return { key: itemKey(entry.name), name: entry.name }
  const product = name.replace(CUT, '')
  const found = product !== name ? findCatalogEntry(product) : null
  return { key: itemKey(found?.name ?? product), name: found?.name ?? name }
}

// Clé d'un produit : la même pour « 2 poireaux émincés » et « Poireau »
export function productKey(name: string) {
  return productOf(name).key
}

// Les produits d'une recette qui comptent pour l'associer à une autre (sel, huile… ne veulent rien dire).
export function productKeys(recipe: Recipe): Set<string> {
  return new Set(recipe.ingredients.filter(i => !isPantryStaple(i.name)).map(i => productOf(i.name).key))
}

// Pour chaque recette pas encore choisie, ses ingrédients en commun avec celles de la semaine
// (tels qu'écrits dans la recette proposée, un par produit).
export function sharedIngredients(candidates: Recipe[], chosen: Recipe[]): Map<string, RecipeIngredient[]> {
  const chosenKeys = new Set(chosen.flatMap(r => [...productKeys(r)]))
  const chosenIds = new Set(chosen.map(r => r.id))
  const result = new Map<string, RecipeIngredient[]>()
  for (const recipe of candidates) {
    if (chosenIds.has(recipe.id)) continue
    const seen = new Set<string>()
    result.set(recipe.id, recipe.ingredients.filter(i => {
      if (isPantryStaple(i.name)) return false
      const { key } = productOf(i.name)
      if (!chosenKeys.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    }))
  }
  return result
}

// Un ingrédient à acheter ; `note` : ce qu'il faut en plus dans une autre unité (« + 300 g »)
export type MergedIngredient = RecipeIngredient & { note?: string }

export type SharedProduct = { key: string; name: string; ingredient: MergedIngredient; recipeIds: string[] }

// Une quantité lisible pour la liste de courses : « 300 g », « 2 à la pièce »
export function amountText(quantity: number, unit: string | null) {
  return `${formatQuantity(quantity)} ${unit?.trim() || 'à la pièce'}`
}

// Tous les ingrédients des recettes choisies, chacune pour son nombre de personnes, un seul par produit.
// Les quantités de même unité s'additionnent. Avec des unités différentes, la première unité donne la quantité
// et les autres passent dans `note` (« + 300 g ») : rien ne se perd.
export function mergeIngredients(plan: { recipe: Recipe; people: number }[]): SharedProduct[] {
  const products = new Map<string, SharedProduct>()
  // Par produit : unité → quantité (null = une recette ne la précise pas)
  const amounts = new Map<string, Map<string, { unit: string | null; quantity: number | null }>>()
  for (const { recipe, people } of plan) {
    for (const ing of scaleIngredients(recipe.ingredients, recipe.servings, people)) {
      const { key } = productOf(ing.name)
      const unitKey = ing.unit?.trim().toLowerCase() ?? ''
      const current = products.get(key)
      if (!current) {
        products.set(key, { key, name: ing.name, ingredient: { ...ing }, recipeIds: [recipe.id] })
        amounts.set(key, new Map([[unitKey, { unit: ing.unit ?? null, quantity: ing.quantity }]]))
        continue
      }
      if (!current.recipeIds.includes(recipe.id)) current.recipeIds.push(recipe.id)
      current.ingredient.emoji ??= ing.emoji
      const byUnit = amounts.get(key)!
      const same = byUnit.get(unitKey)
      if (!same) byUnit.set(unitKey, { unit: ing.unit ?? null, quantity: ing.quantity })
      else same.quantity = same.quantity !== null && ing.quantity !== null ? Math.round((same.quantity + ing.quantity) * 100) / 100 : null
    }
  }
  for (const product of products.values()) {
    const [main, ...others] = [...amounts.get(product.key)!.values()]
    Object.assign(product.ingredient, { quantity: main.quantity, unit: main.unit })
    const extra = others.filter(o => o.quantity !== null).map(o => amountText(o.quantity!, o.unit))
    if (extra.length) product.ingredient.note = `+ ${extra.join(' + ')}`
  }
  return [...products.values()]
}

// Ce qu'on prépare une seule fois pour plusieurs recettes (sans sel, huile…), le plus partagé d'abord.
export function sharedProducts(plan: { recipe: Recipe; people: number }[]): SharedProduct[] {
  return mergeIngredients(plan)
    .filter(p => p.recipeIds.length > 1 && !isPantryStaple(p.name))
    .sort((a, b) => b.recipeIds.length - a.recipeIds.length)
    // Le nom simple du produit : « Poireaux » plutôt que « poireaux émincés »
    .map(p => ({ ...p, ingredient: { ...p.ingredient, name: productOf(p.name).name } }))
}
