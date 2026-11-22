'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import KitchenTip from '@/components/recipes/KitchenTip'
import StepPhotoBlock from '@/components/recipes/StepPhoto'
import { Thumb } from '@/components/recipes/BatchCooking'
import {
  AllSteps, COOK_WIDTH, CookBar, EquipmentList, IngredientGrid, IngredientsSheet, Step,
  useSnapToSteps, useWakeLock,
} from '@/components/recipes/CookMode'
import { TimerTray, useTimers } from '@/components/recipes/CookTimers'
import { recordCooking } from '@/app/(app)/recipes/actions'
import { mergeIngredients, sharedProducts } from '@/lib/recipes/batch'
import { batchSchedule } from '@/lib/recipes/batch-cook'
import { formatDuration, stepTimers } from '@/lib/recipes/cook'
import { scaleIngredients } from '@/lib/recipes/ingredients'
import { FEATURES } from '@/lib/ui/features'
import type { Recipe, StepPhoto } from '@/types/database'

// Mode cuisine du batch cooking : toutes les recettes de la semaine en même temps (lib/recipes/batch-cook.ts).
// D'abord tout le matériel, puis la semaine (recettes, temps gagné, ce qui se prépare d'un coup, tous les
// ingrédients), puis une seule suite d'étapes mélangées : pendant qu'une recette cuit, on avance les autres.
// Chaque étape dit sa recette. Une recette est rangée dans l'historique
// dès qu'on passe sa dernière étape : une fenêtre le dit, et on continue les autres sans quitter le mode cuisine.
// L'endroit où on en est est gardé dans le téléphone : en revenant, on reprend au même écran (et les
// minuteurs ont continué de tourner, CookTimers).

type Week = { recipe: Recipe; people: number }[]

// Où on en est : les recettes de cette session (dans l'ordre, même celles finies depuis), l'écran,
// et celles déjà rangées dans l'historique
type Saved = { key: string; ids: string[]; screen: number; gathering: boolean; recorded: string[] }
const SAVED_KEY = 'hestia.batchCook'

function readSaved(): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null') as Saved | null
    return saved && Array.isArray(saved.ids) && Array.isArray(saved.recorded) && typeof saved.screen === 'number' ? saved : null
  } catch {
    return null
  }
}

function forgetSaved() {
  try { localStorage.removeItem(SAVED_KEY) } catch {}
}

// Le nom court d'une recette, pour qu'une étape tienne sur l'écran :
// « Fondue aux poireaux : la meilleure recette » → « Fondue aux poireaux »
function shortTitle(title: string) {
  return title.split(/\s[:–—-]\s|,|\s\(/)[0].trim() || title
}

// `week` : toute la semaine, même les recettes déjà cuisinées (`cooked`) ; `weekKey` change avec la semaine.
export default function BatchCookMode({ week, cooked, weekKey, stepPhotos }: { week: Week; cooked: string[]; weekKey: string; stepPhotos: Record<string, StepPhoto[]> }) {
  const router = useRouter()
  const [start, setStart] = useState<{ saved: Saved; week: Week } | null>(null)

  // Une seule fois, en arrivant : on reprend la session gardée si c'est la même semaine, sinon on part
  // des recettes pas encore cuisinées. Ensuite, la session ne change plus, même quand la page se
  // recharge parce qu'une recette est partie dans l'historique.
  const first = useRef({ week, cooked, weekKey })
  useEffect(() => {
    const { week, cooked, weekKey } = first.current
    const known = new Map(week.map(w => [w.recipe.id, w]))
    let saved = readSaved()
    if (!saved || saved.key !== weekKey || !saved.ids.length || !saved.ids.every(id => known.has(id))) {
      const ids = week.map(w => w.recipe.id).filter(id => !cooked.includes(id))
      if (!ids.length) {
        router.replace('/recipes/batch-cooking')
        return
      }
      saved = { key: weekKey, ids, screen: 0, gathering: true, recorded: [] }
    }
    const ids = saved.ids
    setStart({ saved, week: ids.map(id => known.get(id)!) })
  }, [router])

  if (!start) return <div className={`page-wrap ${COOK_WIDTH}`} aria-busy="true" />
  return <BatchSession week={start.week} saved={start.saved} stepPhotos={stepPhotos} />
}

function BatchSession({ week, saved, stepPhotos }: { week: Week; saved: Saved; stepPhotos: Record<string, StepPhoto[]> }) {
  const byId = useMemo(() => new Map(week.map(w => [w.recipe.id, w])), [week])
  const schedule = useMemo(() => batchSchedule(week.map(w => ({ id: w.recipe.id, steps: w.recipe.steps }))), [week])
  const steps = schedule.steps
  const shown = useMemo(
    () => new Map(week.map(({ recipe, people }) => [recipe.id, scaleIngredients(recipe.ingredients, recipe.servings, people)])),
    [week],
  )
  const equipment = useMemo(() => {
    const seen = new Set<string>()
    return week.flatMap(w => w.recipe.equipment).filter(name => {
      const key = name.trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [week])
  const tips = week.filter(w => w.recipe.kitchenTip)

  const [photos, setPhotos] = useState(stepPhotos)
  // 0 : la semaine et les ingrédients ; 1 à steps.length : les étapes ; après : c'est prêt
  const [screen, setScreen] = useState(() => Math.max(0, Math.min(steps.length + 1, saved.screen)))
  const [gathering, setGathering] = useState(saved.gathering && equipment.length > 0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [recorded, setRecorded] = useState(() => saved.recorded)
  // La recette qu'on vient de finir (fenêtre « C'est prêt ») ; on reste dans le mode cuisine
  const [finished, setFinished] = useState<string | null>(null)
  const timers = useTimers()
  useWakeLock()
  useSnapToSteps(screen >= 1 && screen <= steps.length)

  // Où on en est, gardé à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify({ key: saved.key, ids: saved.ids, screen, gathering, recorded } satisfies Saved))
    } catch {}
  }, [saved.key, saved.ids, screen, gathering, recorded])

  const done = screen > steps.length

  function go(next: number) {
    // En passant la dernière étape d'une recette, elle va dans l'historique
    const leaving = steps[screen - 1]
    if (next > screen && leaving?.last && !recorded.includes(leaving.recipeId)) {
      setRecorded(r => [...r, leaving.recipeId])
      void recordCooking(leaving.recipeId, byId.get(leaving.recipeId)!.people)
      // Pas à la toute fin : l'écran « C'est prêt » de la semaine le dit déjà
      if (next <= steps.length) setFinished(leaving.recipeId)
    }
    if (next < 0 && equipment.length) setGathering(true)
    setScreen(Math.max(0, Math.min(steps.length + 1, next)))
    window.scrollTo({ top: 0 })
  }

  const moveRef = useRef((by: number) => go(screen + by))
  useEffect(() => {
    moveRef.current = (by: number) => (gathering ? by > 0 && setGathering(false) : go(screen + by))
  })
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === 'ArrowRight') moveRef.current(1)
      if (e.key === 'ArrowLeft') moveRef.current(-1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  if (done) return <Finished week={week} />

  if (gathering) {
    return (
      <div className={`page-wrap !pt-3 !pb-0 -mb-24 ${COOK_WIDTH}`}>
        <p className="eyebrow mb-2">Batch cooking</p>
        <h1 className="text-3xl leading-tight mb-1">Matériel</h1>
        <p className="text-ink-muted mb-5">Pour toutes les recettes.</p>
        <EquipmentList equipment={equipment} />
        {tips.map(({ recipe }) => (
          <div key={recipe.id} className="mt-3">
            <p className="text-sm font-semibold text-pink-deep mb-1">{recipe.title}</p>
            <KitchenTip tip={recipe.kitchenTip!} large />
          </div>
        ))}
        <CookBar tray={<TimerTray timers={timers} step={null} durations={[]} />}>
          <button type="button" onClick={() => { setGathering(false); window.scrollTo({ top: 0 }) }} className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
            Suivant <Icon name="chevronRight" />
          </button>
        </CookBar>
      </div>
    )
  }

  const current = steps[screen - 1]
  const recipeOf = (id: string) => byId.get(id)!.recipe
  const nameOf = (id: string) => shortTitle(recipeOf(id).title)

  return (
    <div className={`page-wrap !pt-3 !pb-0 -mb-24 ${COOK_WIDTH}`}>
      {screen >= 1 && <div aria-hidden="true" className="absolute top-0 left-0 w-px h-px snap-start" />}
      <p className="eyebrow mb-2">Batch cooking</p>

      {steps.length > 0 && (
        <div className="flex gap-1 mb-4" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < screen ? 'bg-rose' : 'bg-coconut'}`} />
          ))}
        </div>
      )}

      {screen === 0 ? (
        <WeekOverview week={week} minutes={schedule.minutes} separateMinutes={schedule.separateMinutes} />
      ) : (
        <Step
          key={screen}
          number={current.index + 1}
          count={recipeOf(current.recipeId).steps.length}
          heading={
            <>
              <span className="block truncate">{nameOf(current.recipeId)}</span>
              <span className="block text-base font-sans font-normal text-ink-muted">
                Étape {current.index + 1} sur {recipeOf(current.recipeId).steps.length}
              </span>
            </>
          }
          text={current.text}
          next={steps[screen] ? `${nameOf(steps[screen].recipeId)} · ${steps[screen].text}` : null}
          ingredients={shown.get(current.recipeId)!}
          ratio={byId.get(current.recipeId)!.people / recipeOf(current.recipeId).servings}
          onIngredients={() => setSheetOpen(true)}
          photo={
            <StepPhotoBlock
              recipeId={current.recipeId}
              step={current.index}
              photo={(photos[current.recipeId] ?? []).findLast(p => p.step === current.index) ?? null}
              onChange={photo => setPhotos(all => ({
                ...all,
                [current.recipeId]: [...(all[current.recipeId] ?? []).filter(x => x.step !== current.index), ...(photo ? [photo] : [])],
              }))}
            />
          }
        />
      )}

      {screen >= 1 && (
        <AllSteps
          steps={steps.map(s => ({
            text: s.text,
            ingredients: shown.get(s.recipeId)!,
            ratio: byId.get(s.recipeId)!.people / recipeOf(s.recipeId).servings,
            recipe: nameOf(s.recipeId),
          }))}
          current={screen}
          onPick={n => go(n)}
        />
      )}

      <CookBar
        tray={
          <TimerTray
            timers={timers}
            step={screen >= 1 ? screen : null}
            durations={current ? stepTimers(current.text) : []}
            where={current ? nameOf(current.recipeId) : null}
          />
        }
      >
        {screen === 0 ? (
          <button type="button" onClick={() => go(1)} className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
            Commencer <Icon name="chevronRight" />
          </button>
        ) : (
          <>
            <button type="button" onClick={() => go(screen - 1)} aria-label="Étape précédente" title="Étape précédente" className="icon-btn icon-btn-xl bg-surface hairline">
              <Icon name="chevronLeft" />
            </button>
            <button type="button" onClick={() => go(screen + 1)} className={`btn-feature btn-xl flex-1 min-w-0 ${FEATURES.recipes.fill}`}>
              {screen === steps.length ? <>C’est prêt <Icon name="check" /></> : <>Étape suivante <Icon name="chevronRight" /></>}
            </button>
          </>
        )}
      </CookBar>

      {finished && (
        <RecipeDone
          title={recipeOf(finished).title}
          left={week.filter(w => !recorded.includes(w.recipe.id)).length}
          onClose={() => setFinished(null)}
        />
      )}

      {sheetOpen && current && (
        <IngredientsSheet onClose={() => setSheetOpen(false)}>
          {/* D'abord la recette de l'étape, puis les autres pas encore finies, puis celles déjà finies,
              estompées, dans l'ordre de la semaine */}
          {[
            current.recipeId,
            ...week.map(w => w.recipe.id).filter(id => id !== current.recipeId && !recorded.includes(id)),
            ...week.map(w => w.recipe.id).filter(id => id !== current.recipeId && recorded.includes(id)),
          ].map((id, i) => {
            const finished = id !== current.recipeId && recorded.includes(id)
            return (
              <section key={id} className={`${i > 0 ? 'mt-6' : ''} ${finished ? 'opacity-50' : ''}`}>
                <p className="eyebrow mb-3 truncate">
                  {finished && <Icon name="check" size={14} className="inline -mt-0.5 mr-1" />}
                  {nameOf(id)} · {finished ? 'prête' : `${byId.get(id)!.people} pers.`}
                </p>
                <IngredientGrid ingredients={shown.get(id)!} large />
              </section>
            )
          })}
        </IngredientsSheet>
      )}
    </div>
  )
}

// La semaine : les recettes, le temps gagné, ce qui se prépare d'un coup, puis tous les ingrédients réunis
function WeekOverview({ week, minutes, separateMinutes }: { week: Week; minutes: number; separateMinutes: number }) {
  const together = sharedProducts(week)
  const all = mergeIngredients(week)
  return (
    <>
      <h1 className="text-3xl leading-tight mb-1">Toute la semaine</h1>
      {/* Estimation arrondie aux 5 minutes */}
      <p className="text-ink-muted mb-5">
        Environ {formatDuration(Math.ceil(minutes / 5) * 300)}
        {separateMinutes - minutes >= 10 && <> au lieu de {formatDuration(Math.ceil(separateMinutes / 5) * 300)}</>}
      </p>

      <ul className="flex flex-col gap-2 mb-6">
        {week.map(({ recipe, people }) => (
          <li key={recipe.id} className="card hairline !p-2 flex items-center gap-3">
            <Thumb recipe={recipe} />
            <span className="flex-1 min-w-0">
              <span className="block font-display font-semibold leading-tight line-clamp-2">{recipe.title}</span>
              <span className="block text-sm text-ink-muted">{people} pers.</span>
            </span>
          </li>
        ))}
      </ul>

      {together.length > 0 && (
        <section className="mb-6" aria-labelledby="together-title">
          <h2 id="together-title" className="eyebrow mb-2">À préparer d’un coup</h2>
          <div className={ingredientGrid}>
            {together.map(p => (
              <IngredientTile key={p.key} ingredient={p.ingredient} note={`${p.recipeIds.length} recettes`} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all-title">
        <h2 id="all-title" className="eyebrow mb-2">Ingrédients</h2>
        <IngredientGrid ingredients={all.map(p => p.ingredient)} />
      </section>
    </>
  )
}

// Une recette vient d'être finie (elle est dans l'historique) : on le fête, puis on continue les autres
function RecipeDone({ title, left, onClose }: { title: string; left: number; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter') && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="recipe-done-title">
      <button type="button" aria-label="Continuer" onClick={onClose} data-veil className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-center text-center">
        <span className={`pop-in w-16 h-16 rounded-full flex items-center justify-center mt-2 mb-4 ${FEATURES.recipes.fill}`} aria-hidden="true">
          <Icon name="check" size={36} />
        </span>
        <h2 id="recipe-done-title" className="font-display font-semibold text-3xl tracking-tight leading-tight">C’est prêt&nbsp;!</h2>
        <p className="text-xl mt-1 line-clamp-2">{shortTitle(title)}</p>
        <p className="text-ink-muted mt-1 mb-6">{left > 1 ? `Encore ${left} recettes` : 'Encore une recette'}</p>
        <button type="button" onClick={onClose} autoFocus className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
          Continuer <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  )
}

// Toute la semaine est cuisinée (chaque recette est déjà dans l'historique)
function Finished({ week }: { week: Week }) {
  return (
    <div className={`page-wrap pb-32 ${COOK_WIDTH}`}>
      <p className="eyebrow mb-3">Batch cooking</p>
      <div className="card hairline flex flex-col items-center text-center !py-8 mb-2">
        <span className={`pop-in w-20 h-20 rounded-full flex items-center justify-center mb-5 ${FEATURES.recipes.fill}`} aria-hidden="true">
          <Icon name="recipes" size={44} />
        </span>
        <h1 className="font-display font-semibold text-4xl tracking-tight leading-tight">C’est prêt&nbsp;!</h1>
        <p className="text-xl text-ink-muted mt-2">Bonne semaine&nbsp;!</p>
      </div>
      <ul className="flex flex-col gap-2">
        {week.map(({ recipe }) => (
          <li key={recipe.id}>
            <Link href={`/recipes/${recipe.id}`} className="card hairline !p-2 flex items-center gap-3 hover:opacity-80">
              <Thumb recipe={recipe} />
              <span className="flex-1 min-w-0 font-display font-semibold leading-tight line-clamp-2">{recipe.title}</span>
              <Icon name="check" className="shrink-0 text-pink-deep mr-2" />
            </Link>
          </li>
        ))}
      </ul>
      <ActionBar detached>
        <Link href="/recipes/batch-cooking" onClick={forgetSaved} className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
          Retour au batch cooking
        </Link>
      </ActionBar>
    </div>
  )
}
