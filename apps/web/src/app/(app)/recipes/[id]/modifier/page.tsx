import { notFound } from 'next/navigation'
import RecipeForm from '@/components/recipes/RecipeForm'
import RecipePhotos from '@/components/recipes/RecipePhotos'
import { isRecipeCategory } from '@/lib/recipes/categories'
import { isDishType } from '@/lib/recipes/dish-types'
import { isRecipeLabel } from '@/lib/recipes/labels'
import { isSeason } from '@/lib/recipes/seasons'
import { getEquipmentSuggestions, getRecipe, getRecipePhotos } from '../../actions'

// Modifier une recette : ses photos (modifiées sur place), puis le même formulaire, rempli, avec « Supprimer la recette » en bas.
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [recipe, photos, equipmentSuggestions] = await Promise.all([getRecipe(id), getRecipePhotos(id), getEquipmentSuggestions()])
  if (!recipe) notFound()

  return (
    <div className="page-wrap max-w-xl">
      <h1 className="text-3xl mb-6">Modifier la recette</h1>
      <div className="mb-6">
        <RecipePhotos recipeId={recipe.id} photos={photos} coverPhotoId={recipe.coverPhotoId} inPlace />
      </div>
      <RecipeForm
        edit={{ id: recipe.id, rating: recipe.rating }}
        equipmentSuggestions={equipmentSuggestions}
        initial={{
          title: recipe.title,
          category: isRecipeCategory(recipe.category) ? recipe.category : null,
          dishType: isDishType(recipe.dishType) ? recipe.dishType : null,
          labels: recipe.labels.filter(isRecipeLabel),
          seasons: recipe.seasons.filter(isSeason),
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          ingredients: recipe.ingredients,
          equipment: recipe.equipment,
          steps: recipe.steps,
          source: recipe.sourceUrl ?? recipe.sourceBook,
        }}
      />
    </div>
  )
}
