import { redirect } from 'next/navigation'
import RecipeToShopping from '@/components/recipes/RecipeToShopping'
import { mergeIngredients, productKey } from '@/lib/recipes/batch'
import { isPantryStaple, scaleIngredients } from '@/lib/recipes/ingredients'
import { itemKey } from '@/lib/shopping/catalog'
import { getItemMemory, getShoppingItems } from '../../../actions'
import { getBatchPlan, getRecipes } from '../../actions'

// « Ajouter aux courses » du batch cooking : les ingrédients de toutes les recettes de la semaine,
// un seul par produit (riz des trois recettes additionné), comme pour une recette seule.
export default async function BatchShoppingPage() {
  const [plan, recipes, items, memory] = await Promise.all([getBatchPlan(), getRecipes(), getShoppingItems(), getItemMemory()])
  const chosen = plan.recipes
    .map(p => ({ recipe: recipes.find(r => r.id === p.recipeId), people: p.people }))
    .filter((p): p is { recipe: (typeof recipes)[number]; people: number } => Boolean(p.recipe))
  if (!chosen.length) redirect('/recipes/batch-cooking')

  const inList = items.filter(i => i.inList).map(i => itemKey(i.name))
  const emojis = Object.fromEntries(Object.entries(memory).map(([k, m]) => [k, m.emoji]))
  for (const item of items) if (item.emoji) emojis[itemKey(item.name)] = item.emoji

  // Un produit par article à acheter ; affiché sous chaque recette qui l'utilise, avec la quantité de cette recette
  const products = mergeIngredients(chosen)
  const index = new Map(products.map((p, i) => [p.key, i]))
  const groups = chosen.map(({ recipe, people }) => ({
    title: recipe.title,
    items: scaleIngredients(recipe.ingredients, recipe.servings, people).map(ingredient => {
      const i = index.get(productKey(ingredient.name))!
      return { product: i, ingredient, shared: products[i].recipeIds.length > 1 && !isPantryStaple(ingredient.name) }
    }),
  }))

  return (
    <RecipeToShopping
      title="Courses de la semaine"
      servings={1}
      initialPeople={1}
      batch={chosen.map(p => ({ recipeId: p.recipe.id, people: p.people }))}
      ingredients={products.map(p => p.ingredient)}
      groups={groups}
      inList={inList}
      emojis={emojis}
    />
  )
}
