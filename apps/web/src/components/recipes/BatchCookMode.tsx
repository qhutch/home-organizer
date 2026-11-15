'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import KitchenTip from '@/components/recipes/KitchenTip'
import StepPhotoBlock from '@/components/recipes/StepPhoto'
import { Thumb } from '@/components/recipes/BatchCooking'
import {
  AllSteps, COOK_WIDTH, EquipmentList, IngredientGrid, IngredientsSheet, Step, TimerTray,
  useSnapToSteps, useTimers, useWakeLock,
} from '@/components/recipes/CookMode'
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
// Chaque étape dit sa recette et ce qui cuit pendant ce temps. Une recette est rangée dans l'historique
// dès qu'on passe sa dernière étape.

type Week = { recipe: Recipe; people: number }[]

// Le nom court d'une recette, pour qu'une étape tienne sur l'écran :
// « Fondue aux poireaux : la meilleure recette » → « Fondue aux poireaux »
function shortTitle(title: string) {
  return title.split(/\s[:–—-]\s|,|\s\(/)[0].trim() || title
}

export default function BatchCookMode({ week, stepPhotos }: { week: Week; stepPhotos: Record<string, StepPhoto[]> }) {
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
  const [screen, setScreen] = useState(0)
  const [gathering, setGathering] = useState(equipment.length > 0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const recorded = useRef(new Set<string>())
  const timers = useTimers()
  useWakeLock()
  useSnapToSteps(screen >= 1 && screen <= steps.length)

  const done = screen > steps.length

  function go(next: number) {
    // En passant la dernière étape d'une recette, elle va dans l'historique
    const leaving = steps[screen - 1]
    if (next > screen && leaving?.last && !recorded.current.has(leaving.recipeId)) {
      recorded.current.add(leaving.recipeId)
      void recordCooking(leaving.recipeId, byId.get(leaving.recipeId)!.people)
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
      <div className={`page-wrap !pt-3 pb-72 ${COOK_WIDTH}`}>
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
        <TimerTray timers={timers} step={null} durations={[]} floating />
        <ActionBar detached>
          <button type="button" onClick={() => { setGathering(false); window.scrollTo({ top: 0 }) }} className={`btn-feature btn-lg w-full ${FEATURES.recipes.fill}`}>
            Suivant <Icon name="chevronRight" />
          </button>
        </ActionBar>
      </div>
    )
  }

  const current = steps[screen - 1]
  const recipeOf = (id: string) => byId.get(id)!.recipe
  const nameOf = (id: string) => shortTitle(recipeOf(id).title)

  return (
    <div className={`page-wrap !pt-3 ${COOK_WIDTH} ${screen === 0 ? 'pb-72' : '!pb-0 -mb-24'}`}>
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
          during={current.during.length > 0 && (
            <p className="flex items-center gap-2 text-lg leading-snug mb-2">
              <Icon name="timer" size={24} className="shrink-0 text-pink-deep" />
              <span className="truncate">
                <span className="font-semibold">Ça cuit : </span>
                {current.during.map(d => (d.label === 'Le four chauffe' ? `${nameOf(d.recipeId)} (le four chauffe)` : nameOf(d.recipeId))).join(' · ')}
              </span>
            </p>
          )}
          text={current.text}
          next={steps[screen] ? `${nameOf(steps[screen].recipeId)} · ${steps[screen].text}` : null}
          ingredients={shown.get(current.recipeId)!}
          ratio={byId.get(current.recipeId)!.people / recipeOf(current.recipeId).servings}
          onIngredients={() => setSheetOpen(true)}
          tray={
            <TimerTray
              timers={timers}
              step={screen}
              durations={stepTimers(current.text)}
              where={nameOf(current.recipeId)}
            />
          }
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

      {screen === 0 && <TimerTray timers={timers} step={null} durations={[]} floating />}

      {screen === 0 ? (
        <ActionBar detached>
          <button type="button" onClick={() => go(1)} className={`btn-feature btn-lg w-full ${FEATURES.recipes.fill}`}>
            Commencer <Icon name="chevronRight" />
          </button>
        </ActionBar>
      ) : (
        <div className="sticky bottom-0 z-40 flex items-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className={barGroup}>
            <button type="button" onClick={() => go(screen - 1)} aria-label="Étape précédente" title="Étape précédente" className="icon-btn icon-btn-xl">
              <Icon name="chevronLeft" />
            </button>
          </div>
          <button type="button" onClick={() => go(screen + 1)} className={`btn-feature btn-xl flex-1 min-w-0 ${FEATURES.recipes.fill}`}>
            {screen === steps.length ? <>C’est prêt <Icon name="check" /></> : <>Étape suivante <Icon name="chevronRight" /></>}
          </button>
        </div>
      )}

      {sheetOpen && current && (
        <IngredientsSheet onClose={() => setSheetOpen(false)}>
          <p className="eyebrow mb-3 truncate">{nameOf(current.recipeId)} · {byId.get(current.recipeId)!.people} pers.</p>
          <IngredientGrid ingredients={shown.get(current.recipeId)!} large />
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
        <Link href="/recipes/batch-cooking" className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
          Retour au batch cooking
        </Link>
      </ActionBar>
    </div>
  )
}
