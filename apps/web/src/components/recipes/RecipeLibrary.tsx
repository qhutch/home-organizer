'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar, { barGroup, barIcon } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import RecipeCard from '@/components/recipes/RecipeCard'
import { FEATURES } from '@/lib/ui/features'
import { RECIPE_CATEGORIES } from '@/lib/recipes/categories'
import { RECIPE_LABELS } from '@/lib/recipes/labels'
import { SEASONS, isRecipeInSeason, seasonOfMonth } from '@/lib/recipes/seasons'
import { EXAMPLE_RECIPES, isExampleId } from '@/lib/recipes/examples'
import type { Recipe } from '@/types/database'

// En dessous, le filtre « De saison » n'est pas coché en arrivant : la page serait presque vide.
const MIN_SEASONAL_RECIPES = 4
// En dessous, des recettes d'exemple complètent la bibliothèque.
const MIN_REAL_RECIPES = 6

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

const chipClass = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`

// Bibliothèque des recettes : en haut une rangée de catégories, puis une rangée de filtres
// (saison, favoris, labels) ; la grille ; recherche et ajout en bas.
// Tant que le foyer a peu de recettes, des exemples complètent la page pour donner une idée.
export default function RecipeLibrary({ recipes: saved }: { recipes: Recipe[] }) {
  const showingExamples = saved.length < MIN_REAL_RECIPES
  const recipes = useMemo(() => (showingExamples ? [...saved, ...EXAMPLE_RECIPES] : saved), [saved, showingExamples])
  const month = new Date().getMonth() + 1
  const seasonName = SEASONS.find(s => s.id === seasonOfMonth(month))!.label.toLowerCase()
  const seasonal = useMemo(() => new Set(recipes.filter(r => isRecipeInSeason(r, month)).map(r => r.id)), [recipes, month])

  const [inSeason, setInSeason] = useState(seasonal.size >= MIN_SEASONAL_RECIPES)
  const [favorites, setFavorites] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [labels, setLabels] = useState<string[]>([])
  const [query, setQuery] = useState('')
  // Pendant la saisie, la recherche prend toute la barre et le + s'efface
  const [searching, setSearching] = useState(false)
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


      <div className="-mx-4 px-4 mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Catégories">
        <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={chipClass(category === null)}>
          Toutes
        </button>
        {RECIPE_CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(v => (v === c.id ? null : c.id))}
            className={chipClass(category === c.id)}
          >
            <Icon name={c.icon} size={16} /> {c.label}
          </button>
        ))}
      </div>

      <div className="-mx-4 px-4 mb-4 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filtres">
        <button type="button" aria-pressed={inSeason} onClick={() => setInSeason(v => !v)} className={chipClass(inSeason)}>
          <Icon name="leaf" size={16} /> De saison
        </button>
        <button type="button" aria-pressed={favorites} onClick={() => setFavorites(v => !v)} className={chipClass(favorites)}>
          <Icon name="heart" size={16} /> Favoris
        </button>
        <span aria-hidden className="shrink-0 w-px my-1.5 bg-line" />
        {RECIPE_LABELS.map(l => (
          <button
            key={l.id}
            type="button"
            aria-pressed={labels.includes(l.id)}
            onClick={() => setLabels(v => (v.includes(l.id) ? v.filter(x => x !== l.id) : [...v, l.id]))}
            className={chipClass(labels.includes(l.id))}
          >
            <Icon name={l.icon} size={16} /> {l.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 min-h-8">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {shown.length} recette{shown.length > 1 ? 's' : ''}
          {inSeason ? ` de saison (${seasonName})` : ''}
        </p>
        {filtered && (
          <button type="button" onClick={clearFilters} className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink">
            Effacer les filtres
          </button>
        )}
      </div>

      {shown.length > 0 ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {shown.map(r => (
            <li key={r.id}><RecipeCard recipe={r} example={isExampleId(r.id)} /></li>
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

      <ActionBar detached>
        {/* Recherche compacte en bas à gauche, loin du + ; pendant la saisie elle prend toute la barre */}
        <div className={`${barGroup} min-w-0 ${searching || query ? 'flex-1' : 'w-56'}`}>
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
            onFocus={() => setSearching(true)}
            onBlur={() => setSearching(false)}
            className="flex-1 min-w-0 bg-transparent px-2 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setQuery(''); inputRef.current?.focus() }} className={`${barIcon} hover:bg-coconut`} aria-label="Effacer">
              <Icon name="close" size={20} />
            </button>
          )}
        </div>
        {!searching && (
          <Link href="/recipes/new" aria-label="Ajouter une recette" className={`${barIcon} !w-14 !h-14 pointer-events-auto ${FEATURES.recipes.fill}`}>
            <Icon name="plus" />
          </Link>
        )}
      </ActionBar>
    </div>
  )
}
