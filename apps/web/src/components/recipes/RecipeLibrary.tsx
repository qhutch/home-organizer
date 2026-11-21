'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import Sheet from '@/components/ui/Sheet'
import RecipeCard, { totalMinutes } from '@/components/recipes/RecipeCard'
import AddRecipeMenu from '@/components/recipes/AddRecipeMenu'
import PlannedRecipes from '@/components/recipes/PlannedRecipes'
import { RECIPE_CATEGORIES } from '@/lib/recipes/categories'
import { RECIPE_LABELS } from '@/lib/recipes/labels'
import { DISH_TYPES } from '@/lib/recipes/dish-types'
import { SEASONS, isRecipeInSeason, seasonOfMonth } from '@/lib/recipes/seasons'
import { recipeSources, recipeSource, type RecipeSource } from '@/lib/recipes/sources'
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

// Filtre de note : au moins tant d'étoiles ; 0 = pas encore notées
const RATINGS = [
  { min: 5, label: '5 étoiles' },
  { min: 4, label: '4 et plus' },
  { min: 3, label: '3 et plus' },
  { min: 0, label: 'Pas encore notées' },
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
  type: string | null; labels: string[]; maxMinutes: number | null; minRating: number | null; sources: string[]
  query: string; recipeId: string; scrollY: number
}

function readSaved(): Saved | null {
  if (!isBack('/recipes')) return null
  try { return JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? 'null') } catch { return null }
}

const chipClass = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`

// Bibliothèque des recettes : en haut « À cuisiner » (envoyées aux courses), puis le bouton « Filtres » suivi des filtres choisis (fiche : catégorie,
// type de plat, saison, labels, note, temps, qui l'a ajoutée, source) ; la grille ; recherche et ajout en bas.
// En arrivant : Plats, Végétarien, De saison (s'il y a assez de recettes de saison).
// initial : filtre choisi en touchant une cartouche sur une fiche recette (/recipes?label=vegan…).
// season=all (« Toute l'année ») : toutes les recettes, « De saison » décoché.
export type LibraryFilter = { category?: string; type?: string; label?: string; season?: string }

export type RecipeAuthor = { uid: string; name: string; avatarUrl: string | null }

// pick (batch cooking) : la même bibliothèque, sans en-tête ni « À cuisiner » ; toucher une carte ouvre la recette
// (avec « Ajouter au menu »), le bouton « Ajouter au menu » de la carte la choisit.
// shared : ingrédients en commun avec la semaine, par recette, montrés sur les cartes.
// barAction : à la place du + de la barre du bas.
export default function RecipeLibrary({ recipes, planned = [], authors = [], initial = {}, pick, shared, barAction, batchChosen = 0 }: {
  recipes: Recipe[]; planned?: PlannedRecipe[]; authors?: RecipeAuthor[]; initial?: LibraryFilter
  pick?: (recipe: Recipe) => void; shared?: Map<string, RecipeIngredient[]>; barAction?: React.ReactNode
  // Recettes déjà choisies pour le batch cooking : « 3 recettes choisies » sur son bouton
  batchChosen?: number
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
  const [category, setCategory] = useState<string | null>(saved ? saved.category : RECIPE_CATEGORIES.some(c => c.id === initial.category) ? initial.category! : fromLink ? null : 'main')
  const [type, setType] = useState<string | null>(saved ? saved.type : initial.category === 'main' && DISH_TYPES.some(t => t.id === initial.type) ? initial.type! : null)
  const [labels, setLabels] = useState<string[]>(saved ? saved.labels : RECIPE_LABELS.some(l => l.id === initial.label) ? [initial.label!] : fromLink ? [] : ['vegetarian'])
  const [maxMinutes, setMaxMinutes] = useState<number | null>(saved?.maxMinutes ?? null)
  const [minRating, setMinRating] = useState<number | null>(saved?.minRating ?? null)
  const [sources, setSources] = useState<string[]>(saved?.sources ?? [])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const sourceList = useMemo(() => recipeSources(recipes), [recipes])
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
    const state: Saved = { inSeason, otherSeason, favorites, author, category, type, labels, maxMinutes, minRating, sources, query, recipeId, scrollY: window.scrollY }
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
    && (minRating === null || (minRating === 0 ? !r.rating : (r.rating ?? 0) >= minRating))
    && (!sources.length || matchesSource(recipeSource(r), sources))
    && (!query.trim() || matches(r, query)),
  )
  const filtered = common || inSeason || otherSeason || favorites || author || category || type || labels.length || maxMinutes || minRating !== null || sources.length || query.trim()

  // Filtres de la fiche déjà choisis, montrés à côté du bouton « Filtres »
  const leaf = <Icon name="leaf" size={16} />
  const categoryInfo = RECIPE_CATEGORIES.find(c => c.id === category)
  const typeInfo = DISH_TYPES.find(t => t.id === type)
  const active: { key: string; label: string; icon: React.ReactNode; remove: () => void }[] = [
    ...(categoryInfo ? [{ key: 'category', label: categoryInfo.label, icon: <Icon name={categoryInfo.icon} size={16} />, remove: () => { setCategory(null); setType(null) } }] : []),
    ...(typeInfo ? [{ key: 'type', label: typeInfo.label, icon: <Icon name={typeInfo.icon} size={16} />, remove: () => setType(null) }] : []),
    ...(inSeason ? [{ key: 'season', label: 'De saison', icon: leaf, remove: () => setInSeason(false) }] : []),
    ...(otherSeason ? [{ key: 'other', label: SEASONS.find(se => se.id === otherSeason)!.label, icon: leaf, remove: () => setOtherSeason(null) }] : []),
    ...RECIPE_LABELS.filter(l => labels.includes(l.id)).map(l => ({
      key: `label:${l.id}`, label: l.label, icon: <Icon name={l.icon} size={16} />, remove: () => setLabels(v => v.filter(x => x !== l.id)),
    })),
    ...(favorites ? [{ key: 'fav', label: 'Favoris', icon: <Icon name="heart" size={16} />, remove: () => setFavorites(false) }] : []),
    ...(minRating !== null ? [{ key: 'rating', label: RATINGS.find(r => r.min === minRating)!.label, icon: <Icon name="star" size={16} />, remove: () => setMinRating(null) }] : []),
    ...(maxMinutes ? [{ key: 'time', label: DURATIONS.find(d => d.max === maxMinutes)!.label, icon: <Icon name="clock" size={16} />, remove: () => setMaxMinutes(null) }] : []),
    ...authors.filter(a => a.uid === author).map(a => ({
      key: 'author', label: a.name, icon: <Avatar name={a.name} url={a.avatarUrl} size={18} />, remove: () => setAuthor(null),
    })),
    ...[...SOURCE_GROUPS, ...sourceList].filter(src => sources.includes(src.id)).map(src => ({
      key: src.id, label: src.label, icon: <Icon name={SOURCE_ICONS[src.kind]} size={16} />, remove: () => setSources(v => v.filter(x => x !== src.id)),
    })),
  ]
  // Les deux grandes sources (en ligne, livres), seulement s'il y a des recettes de ce genre
  const sourceGroups = SOURCE_GROUPS.filter(g => sourceList.some(src => src.kind === g.kind))
  const toggleSource = (id: string) => setSources(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))

  function clearPanelFilters() {
    setCategory(null)
    setType(null)
    setInSeason(false)
    setOtherSeason(null)
    setFavorites(false)
    setAuthor(null)
    setLabels([])
    setMaxMinutes(null)
    setMinRating(null)
    setSources([])
  }

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
    setMinRating(null)
    setSources([])
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
        {batchChosen > 0 && (
          <span className="text-sm">{batchChosen} recette{batchChosen > 1 ? 's' : ''} choisie{batchChosen > 1 ? 's' : ''}</span>
        )}
        <Icon name="chevronRight" size={20} />
      </Link>

      <PlannedRecipes planned={planned} recipes={recipes} />
      </>}

      {/* « Filtres » ouvre la fiche où tout se choisit ; à côté, les filtres choisis, chacun avec sa croix */}
      <div ref={filtersRef} className="-mx-4 px-4 mb-4 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filtres choisis">
        {shared && (
          <button type="button" aria-pressed={commonOnly} onClick={() => setCommonOnly(v => !v)} className={chipClass(commonOnly)}>
            <Icon name="link" size={16} /> Ingrédients en commun
          </button>
        )}
        <button type="button" onClick={() => setFiltersOpen(true)} className={chipClass(false)} aria-haspopup="dialog">
          <Icon name="filters" size={16} /> Filtres
          {active.length > 0 && (
            <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center ${FEATURES.recipes.fill}`}>{active.length}</span>
          )}
        </button>
        {active.map(f => (
          <button key={f.key} type="button" aria-pressed onClick={f.remove} aria-label={`Retirer le filtre ${f.label}`} className={chipClass(true)}>
            {f.icon} {f.label}
            <Icon name="close" size={14} />
          </button>
        ))}
      </div>

      {filtersOpen && (
        <Sheet title="Filtres" onClose={() => setFiltersOpen(false)}>
          <FilterGroup title="Catégorie">
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
          </FilterGroup>

          {category === 'main' && (
            <FilterGroup title="Type de plat">
              {DISH_TYPES.map(t => (
                <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(v => (v === t.id ? null : t.id))} className={chipClass(type === t.id)}>
                  <Icon name={t.icon} size={16} /> {t.label}
                </button>
              ))}
            </FilterGroup>
          )}

          <FilterGroup title="Saison">
            <button type="button" aria-pressed={inSeason} onClick={() => { setInSeason(v => !v); setOtherSeason(null) }} className={chipClass(inSeason)}>
              <Icon name="leaf" size={16} /> De saison ({seasonName})
            </button>
            {SEASONS.filter(se => se.id !== currentSeason).map(se => (
              <button
                key={se.id}
                type="button"
                aria-pressed={otherSeason === se.id}
                onClick={() => { setOtherSeason(v => (v === se.id ? null : se.id)); setInSeason(false) }}
                className={chipClass(otherSeason === se.id)}
              >
                <Icon name="leaf" size={16} /> {se.label}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup title="Labels">
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
          </FilterGroup>

          <FilterGroup title="Note">
            <button type="button" aria-pressed={favorites} onClick={() => setFavorites(v => !v)} className={chipClass(favorites)}>
              <Icon name="heart" size={16} /> Favoris
            </button>
            {RATINGS.map(r => (
              <button key={r.min} type="button" aria-pressed={minRating === r.min} onClick={() => setMinRating(v => (v === r.min ? null : r.min))} className={chipClass(minRating === r.min)}>
                <Icon name="star" size={16} /> {r.label}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup title="Temps total">
            {DURATIONS.map(d => (
              <button key={d.max} type="button" aria-pressed={maxMinutes === d.max} onClick={() => setMaxMinutes(v => (v === d.max ? null : d.max))} className={chipClass(maxMinutes === d.max)}>
                <Icon name="clock" size={16} /> {d.label}
              </button>
            ))}
          </FilterGroup>

          {authors.length > 1 && (
            <FilterGroup title="Ajoutées par">
              {authors.map(a => (
                <button key={a.uid} type="button" aria-pressed={author === a.uid} onClick={() => setAuthor(v => (v === a.uid ? null : a.uid))} className={chipClass(author === a.uid)}>
                  <Avatar name={a.name} url={a.avatarUrl} size={18} /> {a.name}
                </button>
              ))}
            </FilterGroup>
          )}

          {sourceList.length > 1 && (
            <FilterGroup title="Source">
              {/* D'abord les deux qui englobent les autres, puis, à la ligne, chaque site et chaque livre */}
              {sourceGroups.map(g => (
                <button key={g.id} type="button" aria-pressed={sources.includes(g.id)} onClick={() => toggleSource(g.id)} className={chipClass(sources.includes(g.id))}>
                  <Icon name={SOURCE_ICONS[g.kind]} size={16} /> {g.label}
                </button>
              ))}
              {sourceGroups.length > 0 && <span aria-hidden className="basis-full h-0" />}
              {sourceList.map(src => (
                <button
                  key={src.id}
                  type="button"
                  aria-pressed={sources.includes(src.id)}
                  onClick={() => toggleSource(src.id)}
                  className={`${chipClass(sources.includes(src.id))} max-w-full`}
                >
                  <Icon name={SOURCE_ICONS[src.kind]} size={16} /> <span className="truncate">{src.label}</span>
                </button>
              ))}
            </FilterGroup>
          )}

          {/* Toujours visible en bas de la fiche, même quand elle défile */}
          <div className="sticky -bottom-5 -mx-5 -mb-5 px-5 py-4 bg-page flex items-center gap-3">
            {active.length > 0 && (
              <button type="button" onClick={clearPanelFilters} className="btn-outline">Tout retirer</button>
            )}
            <button type="button" onClick={() => setFiltersOpen(false)} className={`btn-feature flex-1 ${FEATURES.recipes.fill}`}>
              {shown.length ? `Voir ${shown.length} recette${shown.length > 1 ? 's' : ''}` : 'Aucune recette'}
            </button>
          </div>
        </Sheet>
      )}

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
            className="flex-1 min-w-0 bg-transparent pl-2 pr-3 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
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

const SOURCE_ICONS = { book: 'book', site: 'link', none: 'pencil' } as const

// « Recettes en ligne » (tous les liens : Instagram, sites…) et « Livres de recettes » (tous les livres)
const SOURCE_GROUPS = [
  { id: 'kind:site', label: 'Recettes en ligne', kind: 'site' },
  { id: 'kind:book', label: 'Livres de recettes', kind: 'book' },
] as const

function matchesSource(source: RecipeSource, chosen: string[]) {
  return chosen.includes(source.id) || chosen.includes(`kind:${source.kind}`)
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-2">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
