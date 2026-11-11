import BatchCooking from '@/components/recipes/BatchCooking'
import { getBatchPlan, getCookings, getMembers, getRecipes } from '../actions'

// Batch cooking : la semaine du foyer (nombre de repas, recettes choisies), et les recettes qui vont bien avec.
export default async function BatchCookingPage() {
  const [recipes, plan, cookings] = await Promise.all([getRecipes(), getBatchPlan(), getCookings()])
  // Une recette supprimée depuis disparaît de la semaine
  const kept = { ...plan, recipes: plan.recipes.filter(p => recipes.some(r => r.id === p.recipeId)) }
  // Personnes qui ont ajouté des recettes, pour le filtre « par qui » du choix de la première recette
  const members = await getMembers(recipes.map(r => r.addedBy))
  const authors = Object.entries(members).map(([uid, m]) => ({ uid, ...m })).sort((a, b) => a.name.localeCompare(b.name))
  // Cuisinées (« C'est prêt ») depuis l'envoi des courses
  const cooked = plan.sentAt ? cookings.filter(c => c.cookedAt >= plan.sentAt!).map(c => c.recipeId) : []
  return <BatchCooking recipes={recipes} authors={authors} initialPlan={kept} cooked={cooked} />
}
