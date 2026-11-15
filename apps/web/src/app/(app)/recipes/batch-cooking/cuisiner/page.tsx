import { redirect } from 'next/navigation'
import BatchCookMode from '@/components/recipes/BatchCookMode'
import { getBatchPlan, getCookings, getRecipes, getStepPhotos } from '../../actions'

// Mode cuisine du batch cooking : toutes les recettes de la semaine pas encore cuisinées, en même temps.
export default async function BatchCookPage() {
  const [recipes, plan, cookings] = await Promise.all([getRecipes(), getBatchPlan(), getCookings()])
  const cooked = new Set(plan.sentAt ? cookings.filter(c => c.cookedAt >= plan.sentAt!).map(c => c.recipeId) : [])
  const week = plan.recipes
    .map(p => ({ recipe: recipes.find(r => r.id === p.recipeId), people: p.people }))
    .filter((p): p is { recipe: (typeof recipes)[number]; people: number } => Boolean(p.recipe) && !cooked.has(p.recipe!.id))
  if (!week.length) redirect('/recipes/batch-cooking')
  const photos = Object.fromEntries(await Promise.all(week.map(async w => [w.recipe.id, await getStepPhotos(w.recipe.id)] as const)))
  return <BatchCookMode week={week} stepPhotos={photos} />
}
