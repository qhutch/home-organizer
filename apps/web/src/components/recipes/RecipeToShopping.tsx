'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import Emoji from '@/components/ui/Emoji'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import { FEATURES } from '@/lib/ui/features'
import { isPantryStaple, scaleIngredients } from '@/lib/recipes/ingredients'
import { emojiFor, itemKey } from '@/lib/shopping/catalog'
import { addIngredientsToShopping } from '@/app/(app)/actions'
import { markBatchSent, planRecipe } from '@/app/(app)/recipes/actions'
import type { RecipeIngredient } from '@/types/database'

const stepper = 'icon-btn icon-btn-sm'

// On choisit les ingrédients à acheter (touchés = cochés), le nombre de personnes,
// puis « Ajouter » les met dans la liste de courses. Titre : le nom de la recette.
// Confirmation : les emojis des articles ajoutés apparaissent un à un, en petit tas.

// Inclinaisons des emojis de la confirmation, pour un tas un peu en désordre
const TILTS = [-8, 6, -4, 10, -10, 4, -6, 8]
const MAX_EMOJIS = 9
// Batch cooking (`batch`) : les ingrédients de toutes les recettes de la semaine, déjà réunis et
// comptés pour leur nombre de personnes ; pas de choix du nombre de personnes, chaque recette passe dans « À cuisiner ».
export default function RecipeToShopping({
  recipeId,
  title,
  servings,
  initialPeople,
  batch,
  ingredients,
  groups,
  inList,
  emojis,
}: {
  recipeId?: string
  title: string
  servings: number
  initialPeople: number
  batch?: { recipeId: string; people: number }[]
  ingredients: RecipeIngredient[]
  // Batch cooking : les ingrédients rangés sous chaque recette (product = place dans `ingredients`, ce qu'on achète).
  // Un produit de plusieurs recettes apparaît sous chacune, avec sa quantité ; le cocher le coche partout.
  groups?: { title: string; items: { product: number; ingredient: RecipeIngredient; shared: boolean }[] }[]
  // Clés (itemKey) des articles déjà dans la liste
  inList: string[]
  // Emoji choisi à la main pour un produit, par clé
  emojis: Record<string, string | null>
}) {
  const already = (name: string) => inList.includes(itemKey(name))
  const [people, setPeople] = useState(initialPeople)
  const [picked, setPicked] = useState(() => ingredients.map(i => !already(i.name) && !isPantryStaple(i.name)))
  const [added, setAdded] = useState<RecipeIngredient[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Ce qui se compte à la pièce s'achète entier : 1,5 pâte feuilletée → 2
  const shown = scaleIngredients(ingredients, servings, people)
    .map(i => (i.quantity !== null && !i.unit ? { ...i, quantity: Math.ceil(i.quantity) } : i))
  const count = picked.filter(Boolean).length
  const allPicked = count === ingredients.length

  function toggle(index: number) {
    setPicked(p => p.map((v, i) => (i === index ? !v : v)))
  }

  function add() {
    setError(null)
    const chosen = shown.filter((_, i) => picked[i])
    startTransition(async () => {
      try {
        await addIngredientsToShopping(chosen)
        // La recette passe dans « À cuisiner »
        if (batch) {
          await Promise.all(batch.map(r => planRecipe(r.recipeId, r.people)))
          // La semaine est décidée : la page Batch cooking montre son compte rendu
          await markBatchSent()
        }
        else if (recipeId) await planRecipe(recipeId, people)
        setAdded(chosen)
      } catch {
        setError('Les courses n’ont pas pu être ajoutées. Réessaie.')
      }
    })
  }

  if (added !== null) {
    // Au-delà de 9, les 8 premiers puis une pastille « +N »
    const shownEmojis = added.length > MAX_EMOJIS ? added.slice(0, MAX_EMOJIS - 1) : added
    const extra = added.length - shownEmojis.length
    return (
      <div className="page-wrap max-w-xl">
        <h1 className="text-3xl leading-tight mb-5">{title}</h1>
        <div className="card hairline flex flex-col items-center text-center !py-8">
          <ul className="flex flex-wrap justify-center max-w-72 -space-x-2 mb-6" aria-hidden="true">
            {shownEmojis.map((ing, i) => (
              <li
                key={i}
                className="pop-in w-16 h-16 rounded-full bg-page hairline flex items-center justify-center"
                style={{ animationDelay: `${i * 70}ms`, '--pop-rotate': `${TILTS[i % TILTS.length]}deg` } as React.CSSProperties}
              >
                <Emoji name={emojiFor(ing.name, null, ing.emoji ?? emojis[itemKey(ing.name)])} size={40} />
              </li>
            ))}
            {extra > 0 && (
              <li
                className={`pop-in w-16 h-16 rounded-full flex items-center justify-center font-display font-semibold ${FEATURES.shopping.fill}`}
                style={{ animationDelay: `${shownEmojis.length * 70}ms` }}
              >
                +{extra}
              </li>
            )}
          </ul>
          <p className="font-display font-semibold text-3xl tracking-tight leading-tight">C’est dans la liste&nbsp;!</p>
          <p className="text-ink-muted mt-2 text-balance">
            {`${added.length > 1 ? `${added.length} articles` : '1 article'} pour ${batch
              ? `${batch.length} ${batch.length > 1 ? 'recettes' : 'recette'}`
              : `${people} ${people > 1 ? 'personnes' : 'personne'}`}. Bon appétit\u00a0!`}
          </p>
        </div>
        <div className="flex gap-2 mt-4">
          <Link href={batch ? '/recipes/batch-cooking' : `/recipes/${recipeId}`} className={`btn-feature-outline flex-1 ${FEATURES.recipes.text}`}>
            {batch ? 'Retour à la semaine' : 'Retour à la recette'}
          </Link>
          <Link href="/shopping" className={`btn-feature flex-1 ${FEATURES.shopping.fill}`}>
            <Icon name="shopping" /> Voir la liste
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap max-w-xl pb-28">
      <h1 className="text-3xl leading-tight mb-5">{title}</h1>

      {!batch && <div className="card hairline !py-3 flex items-center justify-between gap-3 mb-6">
        <span className="font-semibold">Pour combien de personnes ?</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setPeople(p => Math.max(1, p - 1))} disabled={people <= 1} aria-label="Une personne de moins" className={stepper}>
            <Icon name="minus" size={18} />
          </button>
          <span className="font-display font-semibold text-lg w-7 text-center" aria-live="polite">{people}</span>
          <button type="button" onClick={() => setPeople(p => Math.min(50, p + 1))} aria-label="Une personne de plus" className={stepper}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>}

      {ingredients.length ? (
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="font-display font-semibold text-lg">Ingrédients</h2>
            <button
              type="button"
              onClick={() => setPicked(ingredients.map(() => !allPicked))}
              className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              {allPicked ? 'Tout décocher' : 'Tout cocher'}
            </button>
          </div>
          {groups ? (
            <div className="flex flex-col gap-6">
              {groups.map((group, g) => (
                <div key={g}>
                  <h3 className="eyebrow mb-2">{group.title}</h3>
                  <div className={ingredientGrid}>
                    {group.items.map(({ product, ingredient, shared }, i) => {
                      const ing = ingredient.quantity !== null && !ingredient.unit ? { ...ingredient, quantity: Math.ceil(ingredient.quantity) } : ingredient
                      return (
                        <IngredientTile
                          key={i}
                          ingredient={ing}
                          emoji={emojis[itemKey(ing.name)]}
                          selected={picked[product]}
                          onTap={() => toggle(product)}
                          note={already(ing.name) ? 'Déjà dans la liste' : shared ? 'Partagé' : undefined}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className={ingredientGrid}>
            {shown.map((ing, i) => (
              <IngredientTile
                key={i}
                ingredient={ing}
                emoji={emojis[itemKey(ing.name)]}
                selected={picked[i]}
                onTap={() => toggle(i)}
                note={already(ing.name) ? 'Déjà dans la liste' : undefined}
              />
            ))}
          </div>
          )}
        </section>
      ) : (
        <p className="card hairline text-sm text-ink-muted">Cette recette n’a pas d’ingrédients notés.</p>
      )}

      {error && <p role="alert" className="text-sm text-pink-deep mt-4">{error}</p>}

      <ActionBar detached>
        <button
          type="button"
          onClick={add}
          disabled={!count || pending}
          className={`pointer-events-auto btn-feature btn-lg w-full ${FEATURES.recipes.fill}`}
        >
          <Icon name="shopping" />
          {pending ? 'Ajout…' : count ? `Ajouter ${count > 1 ? `${count} articles` : '1 article'} à la liste de courses` : 'Rien à ajouter'}
        </button>
      </ActionBar>
    </div>
  )
}
