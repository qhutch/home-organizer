'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import IngredientSheet from '@/components/recipes/IngredientSheet'
import { FEATURES } from '@/lib/ui/features'
import { RECIPE_CATEGORIES } from '@/lib/recipes/categories'
import { RECIPE_LABELS } from '@/lib/recipes/labels'
import { SEASONS, guessSeasons } from '@/lib/recipes/seasons'
import { parseIngredientLine } from '@/lib/recipes/ingredients'
import type { ImportedRecipe } from '@/lib/recipes/import-code'
import PhotoPicker, { type PickedPhoto } from '@/components/recipes/PhotoPicker'
import { createRecipe, deleteRecipe, updateRecipe } from '@/app/(app)/recipes/actions'
import type { RecipeIngredient } from '@/types/database'

function toNumber(value: string) {
  const n = parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter(v => v !== id) : [...list, id]
}

// origin : place de l'étape avant modification (null = nouvelle), pour que ses photos la suivent
type Step = { key: number; text: string; origin: number | null }
type Ingredient = RecipeIngredient & { key: number }

// Clé unique des tuiles et des étapes (pour React), propre à la page
let lastKey = 0
const newKey = () => ++lastKey

// Formulaire d'une recette : vide (« Écrire moi-même »), rempli par un code recette
// (« Importer avec Claude ») pour qu'on le vérifie avant d'enregistrer, ou une recette existante à modifier
// (edit : sans photo, gérées sur la fiche ; avec « Supprimer la recette » en bas).
// Ingrédients : comme la liste de courses (on tape, une tuile apparaît ; on la touche pour la quantité).
// Étapes : une case par étape — chacune deviendra un écran du mode cuisine.
// Catégorie, labels et saisons viennent après : les saisons se cochent seules d'après les ingrédients.
export default function RecipeForm({ initial, initialPhoto, edit }: {
  initial?: ImportedRecipe
  initialPhoto?: PickedPhoto | null
  edit?: { id: string; rating: number | null }
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [servings, setServings] = useState(initial?.servings ? Math.min(50, Math.round(initial.servings)) : 4)
  const [prep, setPrep] = useState(initial?.prepMinutes ? String(initial.prepMinutes) : '')
  const [cook, setCook] = useState(initial?.cookMinutes ? String(initial.cookMinutes) : '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => (initial?.ingredients ?? []).map(i => ({ ...i, key: newKey() })))
  const [newIngredient, setNewIngredient] = useState('')
  const [openIngredient, setOpenIngredient] = useState<number | null>(null)
  const [steps, setSteps] = useState<Step[]>(() => (initial?.steps.length ? initial.steps : ['']).map((text, i) => ({ key: newKey(), text, origin: edit && initial?.steps.length ? i : null })))
  const stepsRef = useRef<HTMLOListElement>(null)
  const [category, setCategory] = useState<string | null>(initial?.category ?? null)
  const [labels, setLabels] = useState<string[]>(initial?.labels ?? [])
  // Tant qu'on n'y touche pas, les saisons suivent les ingrédients (sauf si Claude les a données)
  const [chosenSeasons, setChosenSeasons] = useState<string[] | null>(initial?.seasons.length ? initial.seasons : null)
  const [rating, setRating] = useState<number | null>(edit?.rating ?? null)
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '')
  const [error, setError] = useState<{ field: 'title' | 'seasons' | 'form'; message: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [photo, setPhoto] = useState<PickedPhoto | null>(initialPhoto ?? null)

  const autoSeasons = useMemo(() => (ingredients.length ? guessSeasons(ingredients) : []), [ingredients])
  const seasons = chosenSeasons ?? autoSeasons
  const opened = ingredients.find(i => i.key === openIngredient)

  // « 200 g de farine » → une tuile farine, 200 g
  function addIngredient() {
    const parsed = parseIngredientLine(newIngredient)
    if (!parsed) return
    setIngredients(list => [...list, { ...parsed, key: newKey() }])
    setNewIngredient('')
  }

  function addStep() {
    setSteps(list => [...list, { key: newKey(), text: '', origin: null }])
    // Place le curseur dans la nouvelle étape
    requestAnimationFrame(() => {
      const fields = stepsRef.current?.querySelectorAll('textarea')
      fields?.[fields.length - 1]?.focus()
    })
  }

  function setSeasons(next: string[]) {
    setChosenSeasons(next)
    setError(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError({ field: 'title', message: 'Donne un nom à la recette.' })
      return
    }
    if (!seasons.length) {
      setError({ field: 'seasons', message: 'Coche au moins une saison, pour que la recette soit mise en avant au bon moment.' })
      return
    }
    setError(null)
    const input = {
      title,
      category,
      labels,
      seasons,
      rating,
      servings,
      prepMinutes: toNumber(prep),
      cookMinutes: toNumber(cook),
      ingredients: ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      steps: steps.map(s => s.text),
      sourceUrl,
    }
    startTransition(async () => {
      const result = edit
        ? await updateRecipe(edit.id, input, steps.map(s => s.origin))
        : await createRecipe(input, photo?.blob ?? null)
      if (result?.error) setError({ field: 'form', message: result.error })
    })
  }

  function remove() {
    if (!edit || !window.confirm('Supprimer cette recette ? On ne pourra pas la récupérer.')) return
    startTransition(() => deleteRecipe(edit.id))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {!edit && (
        <div>
          <p className="eyebrow mb-2">Photo (facultatif)</p>
          <PhotoPicker photo={photo} onChange={setPhoto} />
        </div>
      )}

      <div>
        <label htmlFor="recipe-title" className="eyebrow block mb-2">Nom</label>
        <input
          id="recipe-title"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(null) }}
          placeholder="Lasagnes de Quentin"
          className="field"
          aria-invalid={error?.field === 'title'}
          aria-describedby={error?.field === 'title' ? 'recipe-title-error' : undefined}
        />
        {error?.field === 'title' && <p id="recipe-title-error" className="text-sm text-pink-deep mt-2">{error.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label htmlFor="recipe-prep" className="eyebrow block mb-2">Préparation</label>
          <input id="recipe-prep" inputMode="numeric" value={prep} onChange={e => setPrep(e.target.value)} placeholder="20 min" className="field !px-4" />
        </div>
        <div>
          <label htmlFor="recipe-cook" className="eyebrow block mb-2">Cuisson</label>
          <input id="recipe-cook" inputMode="numeric" value={cook} onChange={e => setCook(e.target.value)} placeholder="45 min" className="field !px-4" />
        </div>
        <div>
          <p className="eyebrow mb-2">Personnes</p>
          <div className="field !px-1 !py-1 flex items-center justify-between">
            <button type="button" onClick={() => setServings(s => Math.max(1, s - 1))} className="icon-btn icon-btn-sm" aria-label="Une personne de moins"><Icon name="minus" /></button>
            <span className="font-semibold" aria-live="polite">{servings}</span>
            <button type="button" onClick={() => setServings(s => Math.min(50, s + 1))} className="icon-btn icon-btn-sm" aria-label="Une personne de plus"><Icon name="plus" /></button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="recipe-new-ingredient" className="eyebrow block mb-2">Ingrédients</label>
        <div className="bg-surface hairline rounded-full p-1.5 min-h-[57px] flex items-center gap-1">
          <input
            id="recipe-new-ingredient"
            value={newIngredient}
            onChange={e => setNewIngredient(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }}
            placeholder="200 g de farine…"
            autoComplete="off"
            enterKeyHint="enter"
            className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint"
          />
          {newIngredient.trim() && (
            <button type="button" onClick={addIngredient} aria-label="Ajouter l’ingrédient" className={`icon-btn-fill ${FEATURES.recipes.fill}`}>
              <Icon name="plus" />
            </button>
          )}
        </div>
        {ingredients.length > 0 && (
          <div className={`${ingredientGrid} mt-3`}>
            {ingredients.map(ingredient => (
              <IngredientTile key={ingredient.key} ingredient={ingredient} onTap={() => setOpenIngredient(ingredient.key)} />
            ))}
          </div>
        )}
      </div>

      <fieldset>
        <legend className="eyebrow mb-3">Étapes</legend>
        <ol ref={stepsRef} className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step.key} className="flex items-start gap-2">
              <span className="w-8 h-8 mt-2.5 shrink-0 rounded-full flex items-center justify-center font-display font-semibold text-sm bg-rose text-rose-ink" aria-hidden="true">
                {i + 1}
              </span>
              <label htmlFor={`recipe-step-${i + 1}`} className="sr-only">Étape {i + 1}</label>
              <textarea
                id={`recipe-step-${i + 1}`}
                value={step.text}
                onChange={e => setSteps(list => list.map(s => (s.key === step.key ? { ...s, text: e.target.value } : s)))}
                rows={2}
                placeholder={i === 0 ? 'Faire revenir les oignons 10 minutes.' : 'Étape suivante…'}
                className="field flex-1 min-w-0 !px-4"
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSteps(list => list.filter(s => s.key !== step.key))}
                  aria-label={`Supprimer l’étape ${i + 1}`}
                  className="icon-btn mt-1 text-ink-muted hover:text-pink-deep"
                >
                  <Icon name="trash" size={20} />
                </button>
              )}
            </li>
          ))}
        </ol>
        <button type="button" onClick={addStep} className="btn-outline mt-3">
          <Icon name="plus" size={20} /> Ajouter une étape
        </button>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Catégorie</legend>
        <div className="flex flex-wrap gap-2">
          {RECIPE_CATEGORIES.map(c => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(v => (v === c.id ? null : c.id))} className={`chip ${category === c.id ? 'is-active' : ''}`}>
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Labels</legend>
        <div className="flex flex-wrap gap-2">
          {RECIPE_LABELS.map(l => (
            <button key={l.id} type="button" aria-pressed={labels.includes(l.id)} onClick={() => setLabels(v => toggle(v, l.id))} className={`chip ${labels.includes(l.id) ? 'is-active' : ''}`}>
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset aria-describedby={error?.field === 'seasons' ? 'recipe-seasons-error' : undefined}>
        <legend className="eyebrow mb-2">Saisons</legend>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map(s => (
            <button key={s.id} type="button" aria-pressed={seasons.includes(s.id)} onClick={() => setSeasons(toggle(seasons, s.id))} className={`chip ${seasons.includes(s.id) ? 'is-active' : ''}`}>
              {s.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={seasons.length === SEASONS.length}
            onClick={() => setSeasons(seasons.length === SEASONS.length ? [] : SEASONS.map(s => s.id))}
            className={`chip ${seasons.length === SEASONS.length ? 'is-active' : ''}`}
          >
            Toute l’année
          </button>
        </div>
        {error?.field === 'seasons' && <p id="recipe-seasons-error" className="text-sm text-pink-deep mt-2">{error.message}</p>}
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Note (facultatif)</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(r => (r === n ? null : n))}
              aria-label={`${n} sur 5`}
              aria-pressed={rating === n}
              className={`w-11 h-11 rounded-full flex items-center justify-center hover:bg-coconut ${rating && n <= rating ? 'text-pink-deep' : 'text-ink-muted'}`}
            >
              <Icon name="star" size={24} className={rating && n <= rating ? 'fill-current' : ''} />
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="recipe-source" className="eyebrow block mb-2">Lien d’origine (facultatif)</label>
        <input id="recipe-source" type="url" inputMode="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://www.instagram.com/…" className="field" />
      </div>

      {error?.field === 'form' && <p className="text-sm text-pink-deep" role="alert">{error.message}</p>}
      {error?.field === 'seasons' && <p className="text-sm text-pink-deep" role="alert">Il manque la saison, plus haut.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="submit" disabled={pending} className="btn">
          {pending ? 'Enregistrement…' : edit ? 'Enregistrer les modifications' : 'Enregistrer la recette'}
        </button>
        {edit && (
          <button type="button" onClick={remove} disabled={pending} className="btn-danger">
            <Icon name="trash" /> Supprimer la recette
          </button>
        )}
      </div>

      {opened && (
        <IngredientSheet
          ingredient={opened}
          onChange={next => setIngredients(list => list.map(i => (i.key === opened.key ? { ...next, key: i.key } : i)))}
          onDelete={() => { setIngredients(list => list.filter(i => i.key !== opened.key)); setOpenIngredient(null) }}
          onClose={() => {
            // Un nom vidé retire l'ingrédient
            setIngredients(list => list.filter(i => i.key !== opened.key || i.name.trim()))
            setOpenIngredient(null)
          }}
        />
      )}
    </form>
  )
}
