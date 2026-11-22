import { redirect } from 'next/navigation'
import BatchCookMode from '@/components/recipes/BatchCookMode'
import { getBatchPlan, getCookings, getRecipes, getStepPhotos } from '../../actions'

// Mode cuisine du batch cooking : les recettes de la semaine, en même temps. Toute la semaine est
// envoyée (même celles déjà cuisinées) : le mode cuisine reprend là où on l'avait quitté (BatchCookMode),
// et ne change pas quand une recette terminée part dans l'historique.
export default async function BatchCookPage() {
  const [recipes, plan, cookings] = await Promise.all([getRecipes(), getBatchPlan(), getCookings()])
  const cooked = plan.sentAt ? cookings.filter(c => c.cookedAt >= plan.sentAt!).map(c => c.recipeId) : []
  const week = plan.recipes
    .map(p => ({ recipe: recipes.find(r => r.id === p.recipeId), people: p.people }))
    .filter((p): p is { recipe: (typeof recipes)[number]; people: number } => Boolean(p.recipe))
  if (!week.length) redirect('/recipes/batch-cooking')
  const photos = Object.fromEntries(await Promise.all(week.map(async w => [w.recipe.id, await getStepPhotos(w.recipe.id)] as const)))
  // La semaine en cours : une autre semaine (ou d'autres recettes) repart du début
  const weekKey = `${plan.sentAt ?? ''}|${week.map(w => w.recipe.id).join(',')}`
  return <BatchCookMode week={week} cooked={cooked} weekKey={weekKey} stepPhotos={photos} />
}
