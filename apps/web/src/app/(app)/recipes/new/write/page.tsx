import RecipeForm from '@/components/recipes/RecipeForm'
import { getEquipmentSuggestions } from '../../actions'

export default async function WriteRecipePage() {
  const equipmentSuggestions = await getEquipmentSuggestions()
  return (
    <div className="page-wrap max-w-xl">
      <h1 className="text-3xl mb-6">Écrire une recette</h1>
      <RecipeForm equipmentSuggestions={equipmentSuggestions} />
    </div>
  )
}
