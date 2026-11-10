import { notFound } from 'next/navigation'
import RecipeForm from '@/components/recipes/RecipeForm'
import { isRecipeCategory } from '@/lib/recipes/categories'
import { isRecipeLabel } from '@/lib/recipes/labels'
import { isSeason } from '@/lib/recipes/seasons'
import { isExampleId } from '@/lib/recipes/examples'
import { getRecipe } from '../../actions'

// Modifier une recette : le même formulaire, rempli, avec « Supprimer la recette » en bas.
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Les exemples ne sont pas en base : rien à modifier
  const recipe = isExampleId(id) ? null : await getRecipe(id)
  if (!recipe) notFound()

  return (
    <div className="page-wrap max-w-xl">
      <h1 className="text-3xl mb-6">Modifier la recette</h1>
      <RecipeForm
        edit={{ id: recipe.id, rating: recipe.rating }}
        initial={{
          title: recipe.title,
          category: isRecipeCategory(recipe.category) ? recipe.category : null,
          labels: recipe.labels.filter(isRecipeLabel),
          seasons: recipe.seasons.filter(isSeason),
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          sourceUrl: recipe.sourceUrl,
        }}
      />
    </div>
  )
}
