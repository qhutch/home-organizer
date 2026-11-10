import { notFound } from 'next/navigation'
import PhotoEditor from '@/components/recipes/PhotoEditor'
import { getRecipe, getRecipePhotos } from '../../../actions'

// Une photo de la recette, en grand : photo principale, recadrer, supprimer.
export default async function RecipePhotoPage({ params }: { params: Promise<{ id: string; photoId: string }> }) {
  const { id, photoId } = await params
  const [recipe, photos] = await Promise.all([getRecipe(id), getRecipePhotos(id)])
  if (!recipe || !photos.some(p => p.id === photoId)) notFound()

  return (
    <div className="page-wrap max-w-xl">
      <h1 className="text-3xl mb-6">{recipe.title}</h1>
      <PhotoEditor recipeId={recipe.id} photoId={photoId} isCover={photoId === recipe.coverPhotoId} />
    </div>
  )
}
