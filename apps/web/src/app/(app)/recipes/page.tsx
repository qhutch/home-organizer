import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import RecipeLibrary from '@/components/recipes/RecipeLibrary'
import { getRecipes } from './actions'

export default async function RecipesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const recipes = await getRecipes()
  return <RecipeLibrary recipes={recipes} />
}
