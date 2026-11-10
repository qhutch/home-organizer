import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import RecipeLibrary from '@/components/recipes/RecipeLibrary'
import { getMembers, getRecipes } from './actions'

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [recipes, params] = await Promise.all([getRecipes(), searchParams])
  // Personnes qui ont ajouté des recettes, pour le filtre « par qui »
  const members = await getMembers(recipes.map(r => r.addedBy))
  const authors = Object.entries(members).map(([uid, m]) => ({ uid, ...m })).sort((a, b) => a.name.localeCompare(b.name))
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)
  // Filtre choisi en touchant une cartouche sur une fiche recette
  const initial = { category: one(params.category), type: one(params.type), label: one(params.label), season: one(params.season) }
  return <RecipeLibrary key={JSON.stringify(initial)} recipes={recipes} authors={authors} initial={initial} />
}
