import { findCatalogEntry, itemKey } from '@/lib/shopping/catalog'
import { isPantryStaple, scaleIngredients } from '@/lib/recipes/ingredients'
import type { Recipe, RecipeIngredient } from '@/types/database'

// Batch cooking : on choisit plusieurs recettes pour la semaine, l'app propose celles qui partagent
// des ingrédients (riz, poireaux…) pour les préparer en une seule fois.

// Un même produit, quelle que soit la façon de l'écrire : « 2 poireaux émincés » et « Poireau » → Poireaux.
function productOf(name: string) {
  const entry = findCatalogEntry(name)
  return { key: itemKey(entry?.name ?? name), name: entry?.name ?? name }
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

export type SharedProduct = { key: string; name: string; ingredient: RecipeIngredient; recipeIds: string[] }

// Tous les ingrédients des recettes choisies, chacune pour son nombre de personnes, un seul par produit.
// Les quantités de même unité s'additionnent ; avec des unités différentes, on n'en garde aucune
// (« Poireaux » plutôt qu'une quantité fausse).
export function mergeIngredients(plan: { recipe: Recipe; people: number }[]): SharedProduct[] {
  const products = new Map<string, SharedProduct>()
  const units = new Map<string, Set<string>>()
  for (const { recipe, people } of plan) {
    for (const ing of scaleIngredients(recipe.ingredients, recipe.servings, people)) {
      const { key } = productOf(ing.name)
      const unit = ing.unit?.trim().toLowerCase() ?? ''
      const current = products.get(key)
      if (!current) {
        products.set(key, { key, name: ing.name, ingredient: { ...ing }, recipeIds: [recipe.id] })
        units.set(key, new Set([unit]))
        continue
      }
      if (!current.recipeIds.includes(recipe.id)) current.recipeIds.push(recipe.id)
      units.get(key)!.add(unit)
      const q = current.ingredient
      if (units.get(key)!.size > 1) Object.assign(q, { quantity: null, unit: null })
      else if (q.quantity !== null && ing.quantity !== null) q.quantity = Math.round((q.quantity + ing.quantity) * 100) / 100
      else q.quantity = null
      q.emoji ??= ing.emoji
    }
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
