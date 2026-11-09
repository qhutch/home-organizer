import RecipeForm from '@/components/recipes/RecipeForm'

export default function WriteRecipePage() {
  return (
    <div className="page-wrap max-w-xl">
      <h1 className="text-3xl mb-6">Écrire une recette</h1>
      <RecipeForm />
    </div>
  )
}
