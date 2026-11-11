'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import RecipeCard, { totalMinutes } from '@/components/recipes/RecipeCard'
import AddRecipeMenu from '@/components/recipes/AddRecipeMenu'
import PlannedRecipes from '@/components/recipes/PlannedRecipes'
import { RECIPE_CATEGORIES } from '@/lib/recipes/categories'
import { RECIPE_LABELS } from '@/lib/recipes/labels'
import { DISH_TYPES } from '@/lib/recipes/dish-types'
import { SEASONS, isRecipeInSeason, seasonOfMonth } from '@/lib/recipes/seasons'
import { FEATURES } from '@/lib/ui/features'
import { clearBack, isBack } from '@/lib/ui/back-nav'
import type { PlannedRecipe, Recipe, RecipeIngredient } from '@/types/database'

// En dessous, le filtre « De saison » n'est pas coché en arrivant : la page serait presque vide.
const MIN_SEASONAL_RECIPES = 4

// Tranches du filtre de durée, sur le temps total (préparation + cuisson) affiché sur les cartes.
// Une recette sans durée n'apparaît dans aucune tranche.
const DURATIONS = [
  { max: 15, label: 'Moins de 15 min' },
  { max: 30, label: 'Moins de 30 min' },
  { max: 60, label: "Moins d'1 h" },
]

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

// En ouvrant une recette, on garde les filtres et la recette touchée : le retour remet la page comme on l'a laissée.
const SAVED_KEY = 'recipes-library'
type Saved = {
  inSeason: boolean; otherSeason: string | null; favorites: boolean; author: string | null; category: string | null
  type: string | null; labels: string[]; maxMinutes: number | null; query: string; recipeId: string; scrollY: number
}

function readSaved(): Saved | null {
  if (!isBack('/recipes')) return null
  try { return JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? 'null') } catch { return null }
}

const chipClass = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`

// Bibliothèque des recettes : en haut « À cuisiner » (envoyées aux courses), une rangée de catégories (avec « Plats », une rangée de types de plats), puis une rangée de filtres
// (saison, favoris, durée, labels) ; la grille ; recherche et ajout en bas.
// initial : filtre choisi en touchant une cartouche sur une fiche recette (/recipes?label=vegan…).
// season=all (« Toute l'année ») : toutes les recettes, « De saison » décoché.
export type LibraryFilter = { category?: string; type?: string; label?: string; season?: string }

export type RecipeAuthor = { uid: string; name: string; avatarUrl: string | null }

// pick (batch cooking) : la même bibliothèque, sans en-tête ni « À cuisiner » ; toucher une carte choisit la recette.
// shared : ingrédients en commun avec la semaine, par recette, montrés sur les cartes.
// barAction : à la place du + de la barre du bas.
export default function RecipeLibrary({ recipes, planned = [], authors = [], initial = {}, pick, shared, barAction }: {
  recipes: Recipe[]; planned?: PlannedRecipe[]; authors?: RecipeAuthor[]; initial?: LibraryFilter
  pick?: (recipe: Recipe) => void; shared?: Map<string, RecipeIngredient[]>; barAction?: React.ReactNode
}) {
  const month = new Date().getMonth() + 1
  const seasonName = SEASONS.find(s => s.id === seasonOfMonth(month))!.label.toLowerCase()
  const seasonal = useMemo(() => new Set(recipes.filter(r => isRecipeInSeason(r, month)).map(r => r.id)), [recipes, month])

  const currentSeason = seasonOfMonth(month)
  const fromLink = Boolean(initial.category || initial.label || initial.season)
  // Retour depuis une recette : filtres et position d'avant
  const [saved] = useState(() => (fromLink || pick ? null : readSaved()))
  const [inSeason, setInSeason] = useState(saved ? saved.inSeason : fromLink ? initial.season === currentSeason : seasonal.size >= MIN_SEASONAL_RECIPES)
  // Une autre saison que celle du moment, choisie depuis une fiche (« Été » en novembre)
  const [otherSeason, setOtherSeason] = useState(saved ? saved.otherSeason :
    initial.season && initial.season !== currentSeason && SEASONS.some(s => s.id === initial.season) ? initial.season : null,
  )
  const [favorites, setFavorites] = useState(saved?.favorites ?? false)
  const [author, setAuthor] = useState<string | null>(saved?.author ?? null)
  const [category, setCategory] = useState<string | null>(saved ? saved.category : RECIPE_CATEGORIES.some(c => c.id === initial.category) ? initial.category! : null)
  const [type, setType] = useState<string | null>(saved ? saved.type : initial.category === 'main' && DISH_TYPES.some(t => t.id === initial.type) ? initial.type! : null)
  const [labels, setLabels] = useState<string[]>(saved ? saved.labels : RECIPE_LABELS.some(l => l.id === initial.label) ? [initial.label!] : [])
  const [maxMinutes, setMaxMinutes] = useState<number | null>(saved?.maxMinutes ?? null)
  // Batch cooking : seulement les recettes qui ont des ingrédients en commun avec la semaine (coché d'office)
  const [commonOnly, setCommonOnly] = useState(true)
  const common = shared && commonOnly
  const filtersRef = useRef<HTMLDivElement>(null)

  // Arrivé depuis une cartouche : le filtre choisi est visible même s'il est loin à droite
  useEffect(() => {
    if (!fromLink) return
    filtersRef.current?.querySelectorAll('.is-active').forEach(el => el.scrollIntoView({ inline: 'center', block: 'nearest' }))
  }, [fromLink])
  const [query, setQuery] = useState(saved?.query ?? '')
  // Après le rendu filtré (et après le retour en haut fait par Next), on revient à la recette
  useEffect(() => {
    clearBack()
    if (!saved) return
    const frame = requestAnimationFrame(() => {
      const card = document.querySelector(`[data-recipe-id="${CSS.escape(saved.recipeId)}"]`)
      if (card) card.scrollIntoView({ block: 'center' })
      else window.scrollTo(0, saved.scrollY)
    })
    return () => cancelAnimationFrame(frame)
  }, [saved])

  function rememberPosition(recipeId: string) {
    const state: Saved = { inSeason, otherSeason, favorites, author, category, type, labels, maxMinutes, query, recipeId, scrollY: window.scrollY }
    try { sessionStorage.setItem(SAVED_KEY, JSON.stringify(state)) } catch {}
  }
  // Pendant la saisie, la recherche prend toute la barre et le + s'efface
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const shown = recipes.filter(r =>
    (!common || (shared.get(r.id)?.length ?? 0) > 0)
    && (!inSeason || seasonal.has(r.id))
    && (!otherSeason || r.seasons.includes(otherSeason))
    && (!favorites || r.favorite)
    && (!author || r.addedBy === author)
    && (!category || r.categories.includes(category))
    && (!type || r.dishTypes.includes(type))
    && labels.every(l => r.labels.includes(l))
    && (!maxMinutes || (totalMinutes(r) ?? Infinity) <= maxMinutes)
    && (!query.trim() || matches(r, query)),
  )
  const filtered = common || inSeason || otherSeason || favorites || author || category || type || labels.length || maxMinutes || query.trim()

  function clearFilters() {
    setCommonOnly(false)
    setInSeason(false)
    setOtherSeason(null)
    setFavorites(false)
    setAuthor(null)
    setCategory(null)
    setType(null)
    setLabels([])
    setMaxMinutes(null)
    setQuery('')
  }

  return (
    <div className={pick ? '' : 'page-wrap'}>
      {!pick && <>
      <PageHeader
        feature="recipes"
        aside={
          <Link href="/recipes/history" aria-label="Historique" title="Historique" className="pill text-ink hover:bg-coconut">
            <Icon name="history" size={20} />
          </Link>
        }
      />

      <Link
        href="/recipes/batch-cooking"
        className={`flex items-center gap-3 rounded-3xl px-4 py-3 mb-5 font-semibold text-pink-deep hover:opacity-80 transition-opacity ${FEATURES.recipes.soft}`}
      >
        <Icon name="fridge" size={24} />
        <span className="flex-1">Batch cooking</span>
        <Icon name="chevronRight" size={20} />
      </Link>

      <PlannedRecipes planned={planned} recipes={recipes} />
      </>}

      <div ref={filtersRef}>
      <div className="-mx-4 px-4 mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Catégories">
        {shared && (
          <>
            <button type="button" aria-pressed={commonOnly} onClick={() => setCommonOnly(v => !v)} className={chipClass(commonOnly)}>
              <Icon name="link" size={16} /> Ingrédients en commun
            </button>
            <span aria-hidden className="shrink-0 w-px my-1.5 bg-line" />
          </>
        )}
        <button type="button" aria-pressed={category === null} onClick={() => { setCategory(null); setType(null) }} className={chipClass(category === null)}>
          Toutes
        </button>
        {RECIPE_CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => { setCategory(v => (v === c.id ? null : c.id)); setType(null) }}
            className={chipClass(category === c.id)}
          >
            <Icon name={c.icon} size={16} /> {c.label}
          </button>
        ))}
      </div>

      {category === 'main' && (
        <div className="-mx-4 px-4 mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Types de plats">
          {DISH_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              aria-pressed={type === t.id}
              onClick={() => setType(v => (v === t.id ? null : t.id))}
              className={chipClass(type === t.id)}
            >
              <Icon name={t.icon} size={16} /> {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="-mx-4 px-4 mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filtres">
        {otherSeason && (
          <button type="button" aria-pressed onClick={() => setOtherSeason(null)} className={chipClass(true)}>
            <Icon name="leaf" size={16} /> {SEASONS.find(s => s.id === otherSeason)!.label}
            <Icon name="close" size={14} />
          </button>
        )}
        <button type="button" aria-pressed={inSeason} onClick={() => { setInSeason(v => !v); setOtherSeason(null) }} className={chipClass(inSeason)}>
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

      {/* Temps total (préparation + cuisson), puis qui a ajouté la recette */}
      <div className="-mx-4 px-4 mb-4 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Temps">
        {DURATIONS.map(d => (
          <button
            key={d.max}
            type="button"
            aria-pressed={maxMinutes === d.max}
            onClick={() => setMaxMinutes(v => (v === d.max ? null : d.max))}
            className={chipClass(maxMinutes === d.max)}
          >
            <Icon name="clock" size={16} /> {d.label}
          </button>
        ))}
        {authors.length > 1 && (
          <>
            <span aria-hidden className="shrink-0 w-px my-1.5 bg-line" />
            {authors.map(a => (
              <button
                key={a.uid}
                type="button"
                aria-pressed={author === a.uid}
                aria-label={`Ajoutées par ${a.name}`}
                onClick={() => setAuthor(v => (v === a.uid ? null : a.uid))}
                className={chipClass(author === a.uid)}
              >
                <Avatar name={a.name} url={a.avatarUrl} size={18} /> {a.name}
              </button>
            ))}
          </>
        )}
      </div>
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
            <li key={r.id} data-recipe-id={r.id} onClick={pick ? undefined : () => rememberPosition(r.id)}>
              <RecipeCard recipe={r} onPick={pick ? () => pick(r) : undefined} shared={shared?.get(r.id)} />
            </li>
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
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setQuery(''); inputRef.current?.focus() }} className="icon-btn" aria-label="Effacer">
              <Icon name="close" size={20} />
            </button>
          )}
        </div>
        {!searching && (pick ? barAction : <AddRecipeMenu />)}
      </ActionBar>
    </div>
  )
}
