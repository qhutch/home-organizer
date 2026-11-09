'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar, { barIcon } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import RecipeCard from '@/components/recipes/RecipeCard'
import { FEATURES } from '@/lib/ui/features'
import { RECIPE_CATEGORIES } from '@/lib/recipes/categories'
import { RECIPE_LABELS } from '@/lib/recipes/labels'
import { SEASONS, isRecipeInSeason, seasonOfMonth } from '@/lib/recipes/seasons'
import type { Recipe } from '@/types/database'

// En dessous, le filtre « De saison » n'est pas coché en arrivant : la page serait presque vide.
const MIN_SEASONAL_RECIPES = 4

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Chaque mot (séparé par des virgules) doit se trouver dans le nom ou dans un ingrédient :
// « courge, oignon » trouve les recettes qui ont les deux.
function matches(recipe: Recipe, query: string) {
  const terms = query.split(',').map(t => normalize(t.trim())).filter(Boolean)
  const haystack = [recipe.title, ...recipe.ingredients.map(i => i.name)].map(normalize)
  return terms.every(term => haystack.some(text => text.includes(term)))
}

// Bibliothèque des recettes : filtres en haut (saison, favoris, catégories), grille, recherche et ajout en bas.
export default function RecipeLibrary({ recipes }: { recipes: Recipe[] }) {
  const month = new Date().getMonth() + 1
  const seasonName = SEASONS.find(s => s.id === seasonOfMonth(month))!.label.toLowerCase()
  const seasonal = useMemo(() => new Set(recipes.filter(r => isRecipeInSeason(r, month)).map(r => r.id)), [recipes, month])

  const [inSeason, setInSeason] = useState(seasonal.size >= MIN_SEASONAL_RECIPES)
  const [favorites, setFavorites] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [labels, setLabels] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const shown = recipes.filter(r =>
    (!inSeason || seasonal.has(r.id))
    && (!favorites || r.favorite)
    && (!category || r.category === category)
    && labels.every(l => r.labels.includes(l))
    && (!query.trim() || matches(r, query)),
  )
  const filtered = inSeason || favorites || category || labels.length || query.trim()

  function clearFilters() {
    setInSeason(false)
    setFavorites(false)
    setCategory(null)
    setLabels([])
    setQuery('')
  }

  return (
    <div className="page-wrap">
      <PageHeader
        feature="recipes"
        aside={
          <Link href="/recipes/history" aria-label="Historique" title="Historique" className="pill text-ink hover:bg-coconut">
            <Icon name="history" size={20} />
          </Link>
        }
      />

      {recipes.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-3 text-center">
          <p className="font-semibold">Ajoute ta première recette</p>
          <p className="text-xs text-ink-muted">Elles seront toutes rangées ici, pour Quentin et toi.</p>
          <Link href="/recipes/new" className="btn mt-2">
            <Icon name="plus" size={20} /> Ajouter une recette
          </Link>
        </div>
      ) : (
        <>
          <div className="-mx-4 px-4 mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filtres">
            <button type="button" aria-pressed={inSeason} onClick={() => setInSeason(v => !v)} className={`chip shrink-0 inline-flex items-center gap-1.5 ${inSeason ? 'is-active' : ''}`}>
              <Icon name="leaf" size={16} /> De saison
              {inSeason && <Icon name="close" size={14} />}
            </button>
            <button type="button" aria-pressed={favorites} onClick={() => setFavorites(v => !v)} className={`chip shrink-0 inline-flex items-center gap-1.5 ${favorites ? 'is-active' : ''}`}>
              <Icon name="heart" size={16} /> Favoris
            </button>
            {RECIPE_CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(v => (v === c.id ? null : c.id))}
                className={`chip shrink-0 ${category === c.id ? 'is-active' : ''}`}
              >
                {c.label}
              </button>
            ))}
            {RECIPE_LABELS.map(l => (
              <button
                key={l.id}
                type="button"
                aria-pressed={labels.includes(l.id)}
                onClick={() => setLabels(v => (v.includes(l.id) ? v.filter(x => x !== l.id) : [...v, l.id]))}
                className={`chip shrink-0 ${labels.includes(l.id) ? 'is-active' : ''}`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <p className="text-sm text-ink-muted mb-3" aria-live="polite">
            {shown.length} recette{shown.length > 1 ? 's' : ''}
            {inSeason ? ` de saison (${seasonName})` : ''}
          </p>

          {shown.length > 0 ? (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {shown.map(r => (
                <li key={r.id}><RecipeCard recipe={r} /></li>
              ))}
            </ul>
          ) : (
            <div className="card py-10 flex flex-col items-center gap-3 text-center">
              <p className="font-semibold">Aucune recette ne correspond</p>
              {filtered && (
                <button type="button" onClick={clearFilters} className="btn-outline">Tout afficher</button>
              )}
            </div>
          )}
        </>
      )}

      <ActionBar>
        <div className="flex items-center gap-1 w-full min-w-0">
          <span className="pl-3 text-ink-muted"><Icon name="search" size={20} /></span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              // On cherche avec ce qu'on a : la saison ne doit pas cacher de résultats
              if (e.target.value.trim()) setInSeason(false)
            }}
            placeholder="Nom ou ingrédients…"
            aria-label="Chercher une recette par nom ou par ingrédients"
            autoComplete="off"
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent px-2 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus() }} className={`${barIcon} hover:bg-coconut`} aria-label="Effacer">
              <Icon name="close" size={20} />
            </button>
          )}
          <Link href="/recipes/new" aria-label="Ajouter une recette" className={`${barIcon} ${FEATURES.recipes.fill}`}>
            <Icon name="plus" />
          </Link>
        </div>
      </ActionBar>
    </div>
  )
}
