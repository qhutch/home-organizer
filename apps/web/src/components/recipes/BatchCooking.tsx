'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import RecipeLibrary, { type RecipeAuthor } from '@/components/recipes/RecipeLibrary'
import RecipeCard from '@/components/recipes/RecipeCard'
import { saveBatchPlan, startNewBatchWeek } from '@/app/(app)/recipes/actions'
import { sharedIngredients, sharedProducts } from '@/lib/recipes/batch'
import { categoryIcon } from '@/lib/recipes/categories'
import { dishTypesOf } from '@/lib/recipes/dish-types'
import { coverUrl } from '@/lib/recipes/photo'
import { FEATURES } from '@/lib/ui/features'
import type { BatchPlan, Recipe } from '@/types/database'

const stepper = 'icon-btn icon-btn-sm'

// Batch cooking : on dit combien de repas on veut, puis on choisit les recettes dans la bibliothèque
// (mêmes filtres que l'accueil des recettes). Dès la première, les cartes montrent leurs ingrédients en commun
// avec la semaine, les plus partagées d'abord. « Partagés » : ce qui sert à plusieurs recettes
// (à préparer d'un coup) ; « Courses » envoie tout. Chaque choix s'enregistre tout de suite.
// Une fois les courses envoyées (sentAt), la page devient le compte rendu de la semaine : « Partagés »,
// les recettes avec « Cuisiner » (cochées après « C'est prêt »), et « Nouvelle semaine » qui l'archive dans l'Historique.
export default function BatchCooking({ recipes, authors, initialPlan, cooked }: {
  recipes: Recipe[]; authors: RecipeAuthor[]; initialPlan: BatchPlan
  // Recettes de la semaine déjà cuisinées depuis l'envoi des courses
  cooked: string[]
}) {
  const [plan, setPlan] = useState(initialPlan)
  const [pending, startTransition] = useTransition()

  const byId = useMemo(() => new Map(recipes.map(r => [r.id, r])), [recipes])
  const chosen = plan.recipes
    .map(p => ({ recipe: byId.get(p.recipeId)!, people: p.people }))
    .filter(p => p.recipe)
  const full = chosen.length >= plan.meals

  // Les recettes pas encore choisies, celles qui ont le plus d'ingrédients en commun d'abord
  const { candidates, shared } = useMemo(() => {
    const week = plan.recipes.map(p => byId.get(p.recipeId)).filter((r): r is Recipe => Boolean(r))
    const shared = sharedIngredients(recipes, week)
    const candidates = recipes
      .filter(r => shared.has(r.id))
      .sort((a, b) => shared.get(b.id)!.length - shared.get(a.id)!.length)
    return { candidates, shared: week.length ? shared : undefined }
  }, [plan.recipes, recipes, byId])

  const prepTogether = sharedProducts(chosen)

  function save(next: BatchPlan) {
    setPlan(next)
    startTransition(() => saveBatchPlan(next))
  }

  const setMeals = (meals: number) => save({ ...plan, meals: Math.min(14, Math.max(1, meals)) })
  const add = (recipe: Recipe) => {
    save({ ...plan, recipes: [...plan.recipes, { recipeId: recipe.id, people: recipe.servings }] })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const remove = (id: string) => save({ ...plan, recipes: plan.recipes.filter(r => r.recipeId !== id) })
  const setPeople = (id: string, people: number) =>
    save({ ...plan, recipes: plan.recipes.map(r => (r.recipeId === id ? { ...r, people: Math.min(50, Math.max(1, people)) } : r)) })

  const coursesLink = (wide: boolean) => (
    <Link href="/recipes/batch-cooking/courses" className={`pointer-events-auto btn-feature btn-lg ${wide ? 'w-full' : 'shrink-0'} ${FEATURES.recipes.fill}`}>
      <Icon name="shopping" /> {wide ? 'Ajouter aux courses' : 'Courses'}
    </Link>
  )

  if (plan.sentAt) {
    const done = chosen.filter(c => cooked.includes(c.recipe.id)).length
    const week = new Date(plan.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })
    return (
      <div className="page-wrap max-w-xl pb-28">
        <h1 className="text-3xl leading-tight">Batch cooking</h1>
        <p className="text-ink-muted mb-5">Semaine du {week}</p>

        <section className="mb-6" aria-labelledby="week-title">
          <div className="flex items-baseline justify-between mb-2">
            <h2 id="week-title" className="eyebrow">Ma semaine</h2>
            <span className="text-sm font-semibold" aria-label={`${done} recettes cuisinées sur ${chosen.length}`}>{done} / {chosen.length}</span>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {chosen.map(({ recipe, people }) => {
              const isDone = cooked.includes(recipe.id)
              return (
                <li key={recipe.id}>
                  <RecipeCard
                    recipe={recipe}
                    done={isDone}
                    action={isDone ? (
                      <p className="text-sm font-semibold text-pink-deep text-center py-2.5">Cuisinée · {people} pers.</p>
                    ) : (
                      <Link href={`/recipes/${recipe.id}/cuisiner?personnes=${people}`} className={`btn-feature w-full ${FEATURES.recipes.fill}`}>
                        Cuisiner · {people} pers.
                      </Link>
                    )}
                  />
                </li>
              )
            })}
          </ul>
        </section>

        {prepTogether.length > 0 && (
          <section className="mb-6" aria-labelledby="prep-title">
            <h2 id="prep-title" className="eyebrow mb-2">Partagés</h2>
            <div className={ingredientGrid}>
              {prepTogether.map(p => (
                <IngredientTile key={p.name} ingredient={p.ingredient} note={`${p.recipeIds.length} recettes`} />
              ))}
            </div>
          </section>
        )}

        <ActionBar detached>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => {
              await startNewBatchWeek()
              setPlan({ ...plan, recipes: [], sentAt: null })
              window.scrollTo(0, 0)
            })}
            className={`pointer-events-auto btn-feature-outline btn-lg w-full ${FEATURES.recipes.text}`}
          >
            <Icon name="plus" /> Nouvelle semaine
          </button>
        </ActionBar>
      </div>
    )
  }

  return (
    <div className="page-wrap pb-28">
      <div className="max-w-xl">
      <h1 className="text-3xl leading-tight mb-5">Batch cooking</h1>

      <div className="card hairline !py-3 flex items-center justify-between gap-3 mb-6">
        <span className="font-semibold">Repas cette semaine</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMeals(plan.meals - 1)} disabled={plan.meals <= 1} aria-label="Un repas de moins" className={stepper}>
            <Icon name="minus" size={18} />
          </button>
          <span className="font-display font-semibold text-lg w-7 text-center" aria-live="polite">{plan.meals}</span>
          <button type="button" onClick={() => setMeals(plan.meals + 1)} disabled={plan.meals >= 14} aria-label="Un repas de plus" className={stepper}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>

      {chosen.length > 0 && (
        <section className="mb-6" aria-labelledby="week-title">
          <div className="flex items-baseline justify-between mb-2">
            <h2 id="week-title" className="eyebrow">Ma semaine</h2>
            <span className="text-sm font-semibold" aria-label={`${chosen.length} repas sur ${plan.meals}`}>{chosen.length} / {plan.meals}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {chosen.map(({ recipe, people }) => (
              <li key={recipe.id} className="card hairline !p-2 flex items-start gap-3">
                <Link href={`/recipes/${recipe.id}?personnes=${people}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                  <Thumb recipe={recipe} />
                </Link>
                <div className="flex-1 min-w-0 pt-1">
                  <Link href={`/recipes/${recipe.id}?personnes=${people}`} className="block font-display font-semibold leading-tight line-clamp-2 hover:opacity-70">
                    {recipe.title}
                  </Link>
                  <div className="flex items-center gap-1 mt-1 -ml-1">
                    <button type="button" onClick={() => setPeople(recipe.id, people - 1)} disabled={people <= 1} aria-label={`Une personne de moins pour ${recipe.title}`} className={stepper}>
                      <Icon name="minus" size={18} />
                    </button>
                    <span className="text-sm min-w-14 text-center" aria-live="polite">{people} pers.</span>
                    <button type="button" onClick={() => setPeople(recipe.id, people + 1)} aria-label={`Une personne de plus pour ${recipe.title}`} className={stepper}>
                      <Icon name="plus" size={18} />
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => remove(recipe.id)} aria-label={`Retirer ${recipe.title} de la semaine`} title="Retirer" className="icon-btn icon-btn-sm shrink-0">
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {prepTogether.length > 0 && (
        <section className="mb-6" aria-labelledby="prep-title">
          <h2 id="prep-title" className="eyebrow mb-2">Partagés</h2>
          <div className={ingredientGrid}>
            {prepTogether.map(p => (
              <IngredientTile key={p.name} ingredient={p.ingredient} note={`${p.recipeIds.length} recettes`} />
            ))}
          </div>
        </section>
      )}
      </div>

      {!full && (
        <section aria-labelledby="pick-title">
          <h2 id="pick-title" className="eyebrow mb-2">{chosen.length ? 'Ajouter une nouvelle recette' : 'Première recette'}</h2>
          <RecipeLibrary
            recipes={candidates}
            authors={authors}
            pick={add}
            shared={shared}
            barAction={chosen.length ? coursesLink(false) : null}
          />
        </section>
      )}

      {full && <ActionBar detached>{coursesLink(true)}</ActionBar>}
    </div>
  )
}

// Vignette d'une recette : sa photo principale, sinon l'icône de son type ou de sa catégorie
function Thumb({ recipe }: { recipe: Recipe }) {
  const cover = coverUrl(recipe)
  const icon = dishTypesOf(recipe.dishTypes)[0]?.icon ?? categoryIcon(recipe.category)
  return (
    <span className={`relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden text-pink-deep flex items-center justify-center ${FEATURES.recipes.soft}`}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- photo déjà réduite, servie par notre route
        <img src={cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <Icon name={icon} size={26} />
      )}
    </span>
  )
}
