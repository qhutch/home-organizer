import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import RecipeLibrary from '@/components/recipes/RecipeLibrary'
import { getRecipes } from './actions'

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [recipes, params] = await Promise.all([getRecipes(), searchParams])
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)
  // Filtre choisi en touchant une cartouche sur une fiche recette
  const initial = { category: one(params.category), label: one(params.label), season: one(params.season) }
  return <RecipeLibrary key={JSON.stringify(initial)} recipes={recipes} initial={initial} />
}
