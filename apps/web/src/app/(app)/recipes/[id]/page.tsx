import { notFound } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { categoryLabel } from '@/lib/recipes/categories'
import { labelName } from '@/lib/recipes/labels'
import { seasonsLabel } from '@/lib/recipes/seasons'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import { formatMinutes } from '@/components/recipes/RecipeCard'
import RecipeActions from '@/components/recipes/RecipeActions'
import RecipePhotos from '@/components/recipes/RecipePhotos'
import { getExampleRecipe, isExampleId, photoUrls } from '@/lib/recipes/examples'
import PhotoCarousel from '@/components/recipes/PhotoCarousel'
import { getRecipe, getRecipePhotos } from '../actions'

// Fiche recette, première version : lecture seule. Portions, mode cuisine et courses viendront ensuite.
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Recette d'exemple (pas en base) : même fiche, sans favori, suppression ni photos
  const example = isExampleId(id)
  const [recipe, photos] = example
    ? [getExampleRecipe(id), []]
    : await Promise.all([getRecipe(id), getRecipePhotos(id)])
  if (!recipe) notFound()

  const category = categoryLabel(recipe.category)
  const times = [
    recipe.prepMinutes && `Préparation ${formatMinutes(recipe.prepMinutes)}`,
    recipe.cookMinutes && `Cuisson ${formatMinutes(recipe.cookMinutes)}`,
  ].filter(Boolean)

  return (
    <div className="page-wrap max-w-xl">

      <PhotoCarousel urls={photoUrls(recipe, photos)} />

      {category && <p className="eyebrow mb-1">{category}</p>}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h1 className="text-3xl leading-tight">{recipe.title}</h1>
        {example ? (
          <span className="shrink-0 mt-2 rounded-full bg-surface hairline px-2.5 py-1 text-xs font-semibold text-ink-muted">Exemple</span>
        ) : (
          <RecipeActions id={recipe.id} favorite={recipe.favorite} />
        )}
      </div>

      {(recipe.seasons.length > 0 || recipe.labels.length > 0) && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink mb-2">
          {recipe.seasons.length > 0 && <span className="inline-flex items-center gap-1"><Icon name="leaf" size={16} /> {seasonsLabel(recipe.seasons)}</span>}
          {recipe.labels.length > 0 && <span>{recipe.labels.map(labelName).filter(Boolean).join(' · ')}</span>}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted mb-6">
        {recipe.rating && <span className="inline-flex items-center gap-1"><Icon name="star" size={16} /> {recipe.rating}/5</span>}
        {times.map(t => <span key={t as string} className="inline-flex items-center gap-1"><Icon name="clock" size={16} /> {t}</span>)}
        <span className="inline-flex items-center gap-1"><Icon name="users" size={16} /> {recipe.servings} pers.</span>
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-ink">
            <Icon name="link" size={16} /> Recette d’origine
          </a>
        )}
      </p>

      <section className="mb-6">
        <h2 className="font-display font-semibold text-lg mb-3">Ingrédients</h2>
        {recipe.ingredients.length ? (
          <div className={ingredientGrid}>
            {recipe.ingredients.map((ing, i) => <IngredientTile key={i} ingredient={ing} />)}
          </div>
        ) : <p className="text-sm text-ink-muted">Pas d’ingrédients notés.</p>}
      </section>

      <section className="card mb-2">
        <h2 className="font-display font-semibold text-lg mb-3">Étapes</h2>
        {recipe.steps.length ? (
          <ol className="flex flex-col gap-3 text-sm">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className={`w-5 shrink-0 font-display font-semibold ${FEATURES.recipes.text}`}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-ink-muted">Pas d’étapes notées.</p>}
      </section>

      {!example && <RecipePhotos recipeId={recipe.id} photos={photos} coverPhotoId={recipe.coverPhotoId} />}
    </div>
  )
}
