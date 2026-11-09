'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import { formatMinutes } from '@/components/recipes/RecipeCard'
import type { RecipeIngredient } from '@/types/database'

// Quantité recalculée pour un autre nombre de personnes, arrondie pour rester lisible.
function scale(quantity: number, ratio: number) {
  const q = quantity * ratio
  if (q >= 10) return Math.round(q)
  if (q >= 1) return Math.round(q * 10) / 10
  return Math.round(q * 100) / 100
}

const infoCard = 'card hairline !p-3 flex flex-col gap-1 min-w-0'

// Durées et nombre de personnes (modifiable), puis les ingrédients aux quantités recalculées.
export default function RecipeIngredients({
  servings,
  prepMinutes,
  cookMinutes,
  ingredients,
}: {
  servings: number
  prepMinutes: number | null
  cookMinutes: number | null
  ingredients: RecipeIngredient[]
}) {
  const [people, setPeople] = useState(servings)
  const ratio = people / servings
  const shown = ingredients.map(i => (i.quantity !== null ? { ...i, quantity: scale(i.quantity, ratio) } : i))

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className={infoCard}>
          <span className="eyebrow !text-[0.6875rem]">Préparation</span>
          <span className="font-display font-semibold text-lg leading-tight">{prepMinutes ? formatMinutes(prepMinutes) : '—'}</span>
        </div>
        <div className={infoCard}>
          <span className="eyebrow !text-[0.6875rem]">Cuisson</span>
          <span className="font-display font-semibold text-lg leading-tight">{cookMinutes ? formatMinutes(cookMinutes) : '—'}</span>
        </div>
        <div className={infoCard}>
          <span className="eyebrow !text-[0.6875rem]">Personnes</span>
          <div className="flex items-center justify-between -mx-1">
            <button
              type="button"
              onClick={() => setPeople(p => Math.max(1, p - 1))}
              disabled={people <= 1}
              aria-label="Une personne de moins"
              className="icon-btn icon-btn-sm"
            >
              <Icon name="minus" size={18} />
            </button>
            <span className="font-display font-semibold text-lg leading-tight" aria-live="polite">{people}</span>
            <button
              type="button"
              onClick={() => setPeople(p => Math.min(50, p + 1))}
              aria-label="Une personne de plus"
              className="icon-btn icon-btn-sm"
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
        </div>
      </div>

      <section className="mb-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="font-display font-semibold text-lg">Ingrédients</h2>
          {people !== servings && (
            <button type="button" onClick={() => setPeople(servings)} className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink">
              Revenir à {servings} pers.
            </button>
          )}
        </div>
        {shown.length ? (
          <div className={ingredientGrid}>
            {shown.map((ing, i) => <IngredientTile key={i} ingredient={ing} />)}
          </div>
        ) : <p className="text-sm text-ink-muted">Pas d’ingrédients notés.</p>}
      </section>
    </>
  )
}
