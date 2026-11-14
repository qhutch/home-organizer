import RecipeLink from '@/components/recipes/RecipeLink'
import { getEquipmentSuggestions } from '../../actions'

export default async function LinkRecipePage() {
  const equipmentSuggestions = await getEquipmentSuggestions()
  return (
    <div className="page-wrap max-w-xl">
      <RecipeLink equipmentSuggestions={equipmentSuggestions} />
    </div>
  )
}
