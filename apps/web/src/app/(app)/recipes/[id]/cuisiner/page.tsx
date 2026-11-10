import { notFound } from 'next/navigation'
import CookMode from '@/components/recipes/CookMode'
import { getRecipe, getStepPhotos } from '../../actions'

// Mode cuisine, pour le nombre de personnes choisi sur la fiche (?personnes=).
export default async function CookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ personnes?: string }>
}) {
  const [{ id }, { personnes }] = await Promise.all([params, searchParams])
  const [recipe, stepPhotos] = await Promise.all([getRecipe(id), getStepPhotos(id)])
  if (!recipe) notFound()

  const people = Math.min(50, Math.max(1, Math.round(Number(personnes)) || recipe.servings))

  return (
    <CookMode
      recipeId={recipe.id}
      title={recipe.title}
      servings={recipe.servings}
      initialPeople={people}
      ingredients={recipe.ingredients}
      equipment={recipe.equipment}
      steps={recipe.steps}
      review={{ rating: recipe.rating, comment: recipe.comment ?? '' }}
      stepPhotos={stepPhotos}
    />
  )
}
