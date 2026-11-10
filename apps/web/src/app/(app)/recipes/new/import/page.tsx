import RecipeImport from '@/components/recipes/RecipeImport'
import { getEquipmentSuggestions } from '../../actions'

export default async function ImportRecipePage() {
  const equipmentSuggestions = await getEquipmentSuggestions()
  return (
    <div className="page-wrap max-w-xl">
      <RecipeImport equipmentSuggestions={equipmentSuggestions} />
    </div>
  )
}
