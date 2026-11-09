import { notFound } from 'next/navigation'
import RecipeToShopping from '@/components/recipes/RecipeToShopping'
import { getExampleRecipe, isExampleId } from '@/lib/recipes/examples'
import { itemKey } from '@/lib/shopping/catalog'
import { getItemMemory, getShoppingItems } from '../../../actions'
import { getRecipe } from '../../actions'

// « Ajouter aux courses » : les ingrédients de la recette, tous cochés sauf ceux déjà dans la liste,
// pour le nombre de personnes choisi sur la fiche (?personnes=).
export default async function RecipeShoppingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ personnes?: string }>
}) {
  const [{ id }, { personnes }] = await Promise.all([params, searchParams])
  const [recipe, items, memory] = await Promise.all([
    isExampleId(id) ? getExampleRecipe(id) : getRecipe(id),
    getShoppingItems(),
    getItemMemory(),
  ])
  if (!recipe) notFound()

  const people = Math.min(50, Math.max(1, Math.round(Number(personnes)) || recipe.servings))
  const inList = items.filter(i => i.inList).map(i => itemKey(i.name))
  const emojis = Object.fromEntries(Object.entries(memory).map(([k, m]) => [k, m.emoji]))
  // Un article récent garde son emoji choisi à la main
  for (const item of items) if (item.emoji) emojis[itemKey(item.name)] = item.emoji

  return (
    <RecipeToShopping
      recipeId={recipe.id}
      title={recipe.title}
      servings={recipe.servings}
      initialPeople={people}
      ingredients={recipe.ingredients}
      inList={inList}
      emojis={emojis}
    />
  )
}
