'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import { unplanRecipe } from '@/app/(app)/recipes/actions'
import { categoryIcon } from '@/lib/recipes/categories'
import { dishTypesOf } from '@/lib/recipes/dish-types'
import { coverUrl } from '@/lib/recipes/photo'
import { FEATURES } from '@/lib/ui/features'
import type { PlannedRecipe, Recipe } from '@/types/database'

// « Aujourd'hui », « Hier », « Lundi » (dans la semaine), sinon « 3 nov. »
export function sentDay(iso: string) {
  const date = new Date(iso)
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
  if (days <= 0) return 'Aujourd’hui'
  if (days === 1) return 'Hier'
  const label = days < 7
    ? date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// Rangée « À cuisiner » en haut de la bibliothèque : les recettes envoyées aux courses, la plus récente d'abord.
// Une carte ouvre la recette pour le nombre de personnes envoyé ; le × la retire de la rangée.
export default function PlannedRecipes({ planned, recipes }: { planned: PlannedRecipe[]; recipes: Recipe[] }) {
  const [removed, setRemoved] = useState<string[]>([])
  const [, startTransition] = useTransition()

  const items = planned
    .filter(p => !removed.includes(p.recipeId))
    .map(p => ({ planned: p, recipe: recipes.find(r => r.id === p.recipeId) }))
    .filter((x): x is { planned: PlannedRecipe; recipe: Recipe } => Boolean(x.recipe))
  if (!items.length) return null

  function remove(id: string) {
    setRemoved(r => [...r, id])
    startTransition(() => unplanRecipe(id))
  }

  return (
    <section className="mb-5" aria-labelledby="planned-title">
      <h2 id="planned-title" className="eyebrow mb-2">À cuisiner</h2>
      <ul className="-mx-4 px-4 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {items.map(({ planned: p, recipe }) => {
          const cover = coverUrl(recipe)
          const icon = dishTypesOf(recipe.dishTypes)[0]?.icon ?? categoryIcon(recipe.category)
          return (
            <li key={p.recipeId} className={`relative shrink-0 w-36 rounded-3xl overflow-hidden ${FEATURES.recipes.soft}`}>
              <Link href={`/recipes/${recipe.id}?personnes=${p.people}`} className="block h-full">
                <div className="relative aspect-[4/3] bg-rose/35 text-pink-deep flex items-center justify-center">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- photo déjà réduite (notre route ou Unsplash)
                    <img src={cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Icon name={icon} size={32} className="opacity-70" />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-display font-semibold text-sm leading-tight line-clamp-2">{recipe.title}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    {sentDay(p.sentAt)} · {p.people} pers.
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(p.recipeId)}
                aria-label={`Retirer ${recipe.title} de « À cuisiner »`}
                title="Retirer"
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-surface text-ink flex items-center justify-center hover:bg-coconut"
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
