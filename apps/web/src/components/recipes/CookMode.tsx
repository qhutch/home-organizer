'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import { ReviewFields, useReview, type Review } from '@/components/recipes/RecipeReview'
import { FEATURES } from '@/lib/ui/features'
import { scaleIngredients } from '@/lib/recipes/ingredients'
import { formatCountdown, formatDuration, stepParts, stepTimers } from '@/lib/recipes/cook'
import { photoUrl, shrinkPhoto } from '@/lib/recipes/photo'
import { addRecipePhoto, recordCooking } from '@/app/(app)/recipes/actions'
import type { RecipeIngredient } from '@/types/database'

// Mode cuisine : d'abord les ingrédients (et le nombre de personnes), puis une étape par écran, en grand,
// avec les quantités des ingrédients cités et un minuteur pour chaque durée. L'écran reste allumé.
// « C'est prêt » range la recette dans l'historique, puis propose note, commentaire et photo.

type Timer = { id: number; step: number; seconds: number; endsAt: number }

export default function CookMode({
  recipeId,
  title,
  servings,
  initialPeople,
  ingredients,
  steps,
  example,
  review,
}: {
  recipeId: string
  title: string
  servings: number
  initialPeople: number
  ingredients: RecipeIngredient[]
  steps: string[]
  example: boolean
  review: Review
}) {
  const [people, setPeople] = useState(initialPeople)
  // 0 : les ingrédients ; 1 à steps.length : les étapes ; après : c'est prêt
  const [screen, setScreen] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const timers = useTimers()
  useWakeLock()

  const shown = scaleIngredients(ingredients, servings, people)
  const ratio = people / servings
  const done = screen > steps.length

  function go(next: number) {
    setScreen(Math.max(0, Math.min(steps.length + 1, next)))
    window.scrollTo({ top: 0 })
  }

  // Flèches du clavier (tablette, ordinateur)
  const moveRef = useRef((by: number) => go(screen + by))
  useEffect(() => {
    moveRef.current = (by: number) => go(screen + by)
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

  if (done) return <Finished recipeId={recipeId} title={title} people={people} example={example} review={review} />

  return (
    <div className="page-wrap max-w-xl pb-56">
      <p className="eyebrow mb-3 truncate">{title}</p>

      {/* Avancement : un trait par étape */}
      {steps.length > 0 && (
        <div className="flex gap-1 mb-6" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < screen ? 'bg-rose' : 'bg-coconut'}`} />
          ))}
        </div>
      )}

      {screen === 0 ? (
        <>
          <h1 className="text-3xl leading-tight mb-5">Ingrédients</h1>
          <People people={people} onChange={setPeople} />
          <IngredientGrid ingredients={shown} />
        </>
      ) : (
        <Step
          key={screen}
          number={screen}
          count={steps.length}
          text={steps[screen - 1]}
          ingredients={shown}
          ratio={ratio}
          timers={timers}
        />
      )}

      <TimerTray timers={timers} />

      <ActionBar detached>
        {screen === 0 ? (
          <button type="button" onClick={() => go(1)} className={`btn-feature btn-lg w-full ${FEATURES.recipes.fill}`}>
            {steps.length ? 'Commencer' : 'C’est prêt'} <Icon name={steps.length ? 'chevronRight' : 'check'} />
          </button>
        ) : (
          <>
            <div className={barGroup}>
              <button type="button" onClick={() => go(screen - 1)} aria-label="Étape précédente" title="Étape précédente" className="icon-btn">
                <Icon name="chevronLeft" />
              </button>
              <button type="button" onClick={() => setSheetOpen(true)} aria-label="Ingrédients" title="Ingrédients" className="icon-btn">
                <Icon name="list" />
              </button>
            </div>
            <button type="button" onClick={() => go(screen + 1)} className={`btn-feature btn-lg flex-1 ${FEATURES.recipes.fill}`}>
              {screen === steps.length ? <>C’est prêt <Icon name="check" /></> : <>Étape suivante <Icon name="chevronRight" /></>}
            </button>
          </>
        )}
      </ActionBar>

      {sheetOpen && (
        <IngredientsSheet onClose={() => setSheetOpen(false)}>
          <People people={people} onChange={setPeople} />
          <IngredientGrid ingredients={shown} />
        </IngredientsSheet>
      )}
    </div>
  )
}

// Une étape, en grand : les quantités des ingrédients cités en rose, un minuteur par durée
function Step({
  number,
  count,
  text,
  ingredients,
  ratio,
  timers,
}: {
  number: number
  count: number
  text: string
  ingredients: RecipeIngredient[]
  ratio: number
  timers: ReturnType<typeof useTimers>
}) {
  const parts = stepParts(text, ingredients, ratio)
  const durations = stepTimers(text)
  return (
    <section aria-live="polite">
      <h1 className="eyebrow !text-pink-deep mb-3">Étape {number} sur {count}</h1>
      <p className="text-2xl leading-snug text-pretty">
        {parts.map((p, i) => (
          <span key={i}>
            {p.scaled ? <strong className="font-semibold text-pink-deep">{p.text}</strong> : p.text}
            {p.amount && <strong className="font-semibold text-pink-deep whitespace-nowrap"> ({p.amount})</strong>}
          </span>
        ))}
      </p>
      {durations.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {durations.map(seconds => {
            const running = timers.list.find(t => t.step === number && t.seconds === seconds)
            return running ? (
              <span key={seconds} className={`btn-feature-outline tabular-nums ${FEATURES.recipes.text}`} role="timer">
                <Icon name="timer" /> {formatCountdown((running.endsAt - timers.now) / 1000)}
              </span>
            ) : (
              <button key={seconds} type="button" onClick={() => timers.start(number, seconds)} className={`btn-feature-outline ${FEATURES.recipes.text}`}>
                <Icon name="timer" /> Minuteur {formatDuration(seconds)}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function People({ people, onChange }: { people: number; onChange: (people: number) => void }) {
  return (
    <div className="card hairline !py-3 flex items-center justify-between gap-3 mb-6">
      <span className="font-semibold">Personnes</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(1, people - 1))} disabled={people <= 1} aria-label="Une personne de moins" className="icon-btn icon-btn-sm">
          <Icon name="minus" size={18} />
        </button>
        <span className="font-display font-semibold text-lg w-7 text-center" aria-live="polite">{people}</span>
        <button type="button" onClick={() => onChange(Math.min(50, people + 1))} aria-label="Une personne de plus" className="icon-btn icon-btn-sm">
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  )
}

function IngredientGrid({ ingredients }: { ingredients: RecipeIngredient[] }) {
  if (!ingredients.length) return <p className="card hairline text-sm text-ink-muted">Pas d’ingrédients notés.</p>
  return (
    <div className={ingredientGrid}>
      {ingredients.map((ing, i) => <IngredientTile key={i} ingredient={ing} />)}
    </div>
  )
}

function IngredientsSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="ingredients-title">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <h3 id="ingredients-title" className="font-display font-semibold text-2xl tracking-tight flex-1">Ingrédients</h3>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink text-2xl leading-none px-1" aria-label="Fermer">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Les minuteurs en cours, au-dessus de la barre du bas, quelle que soit l'étape affichée
function TimerTray({ timers }: { timers: ReturnType<typeof useTimers> }) {
  if (!timers.list.length) return null
  return (
    <ul className="fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] z-30 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-label="Minuteurs">
      {timers.list.map(t => {
        const left = (t.endsAt - timers.now) / 1000
        const ringing = left <= 0
        return (
          <li
            key={t.id}
            role="timer"
            className={`pointer-events-auto w-full max-w-lg rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-3 ${ringing ? `${FEATURES.recipes.fill} motion-safe:animate-pulse` : 'bg-surface hairline'}`}
          >
            <Icon name="timer" size={22} />
            <span className="font-display font-semibold text-xl tabular-nums">{ringing ? 'Terminé' : formatCountdown(left)}</span>
            <span className={`text-sm flex-1 ${ringing ? '' : 'text-ink-muted'}`}>Étape {t.step} · {formatDuration(t.seconds)}</span>
            <button
              type="button"
              onClick={() => timers.stop(t.id)}
              aria-label={ringing ? 'Arrêter la sonnerie' : 'Arrêter le minuteur'}
              title={ringing ? 'Arrêter la sonnerie' : 'Arrêter le minuteur'}
              className={ringing ? 'icon-btn bg-surface text-ink' : 'icon-btn'}
            >
              <Icon name={ringing ? 'check' : 'close'} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// Minuteurs : l'heure de fin est gardée, pour rester juste même si le téléphone ralentit la page.
// À la fin, ça sonne (et vibre si le téléphone sait le faire) toutes les 3 s, jusqu'à ce qu'on l'arrête.
function useTimers() {
  const [list, setList] = useState<Timer[]>([])
  const [now, setNow] = useState(() => Date.now())
  const audio = useRef<AudioContext | null>(null)
  const nextId = useRef(1)

  useEffect(() => {
    if (!list.length) return
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick)
  }, [list.length])

  const ringing = list.some(t => t.endsAt <= now)
  useEffect(() => {
    if (!ringing) return
    let rings = 0
    function ring() {
      if (rings++ >= 20) return
      navigator.vibrate?.([300, 150, 300])
      const ctx = audio.current
      if (!ctx) return
      const t = ctx.currentTime
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, t + i * 0.3)
        gain.gain.exponentialRampToValueAtTime(0.4, t + i * 0.3 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.3 + 0.2)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t + i * 0.3)
        osc.stop(t + i * 0.3 + 0.22)
      }
    }
    ring()
    const again = setInterval(ring, 3000)
    return () => clearInterval(again)
  }, [ringing])

  return {
    list,
    now,
    start(step: number, seconds: number) {
      // Le son ne peut être préparé que pendant un toucher (règle des navigateurs, surtout sur iPhone)
      try {
        audio.current ??= new AudioContext()
        void audio.current.resume()
      } catch {}
      const start = Date.now()
      setNow(start)
      setList(l => [...l, { id: nextId.current++, step, seconds, endsAt: start + seconds * 1000 }])
    },
    stop: (id: number) => setList(l => l.filter(t => t.id !== id)),
  }
}

// Garde l'écran allumé pendant qu'on cuisine ; redemandé quand on revient sur l'app.
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let active = true
    async function request() {
      if (document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (active) lock = next
        else void next.release()
      } catch {}
    }
    void request()
    document.addEventListener('visibilitychange', request)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [])
}

// C'est prêt : la recette entre dans l'historique, puis note, commentaire et photo du plat
function Finished({ recipeId, title, people, example, review }: { recipeId: string; title: string; people: number; example: boolean; review: Review }) {
  const state = useReview(recipeId, review, example)
  const [photos, setPhotos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const recorded = useRef(false)

  useEffect(() => {
    if (example || recorded.current) return
    recorded.current = true
    void recordCooking(recipeId, people)
  }, [example, recipeId, people])

  function addPhoto(file: File | undefined) {
    if (!file) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await addRecipePhoto(recipeId, await shrinkPhoto(file))
        if (result && 'id' in result && result.id) setPhotos(p => [...p, result.id as string])
        else setError(result?.error ?? 'Impossible d’ajouter cette photo.')
      } catch {
        setError('Impossible d’ajouter cette photo.')
      }
    })
  }

  return (
    <div className="page-wrap max-w-xl pb-28">
      <p className="eyebrow mb-3 truncate">{title}</p>
      <div className="card hairline flex flex-col items-center text-center !py-8 mb-2">
        <span className={`pop-in w-20 h-20 rounded-full flex items-center justify-center mb-5 ${FEATURES.recipes.fill}`} aria-hidden="true">
          <Icon name="recipes" size={44} />
        </span>
        <h1 className="font-display font-semibold text-3xl tracking-tight leading-tight">C’est prêt&nbsp;!</h1>
        <p className="text-ink-muted mt-2">Bon appétit&nbsp;!</p>
      </div>

      <section className="card hairline flex flex-col gap-5 mb-2">
        <ReviewFields state={state} idPrefix="cook-review" />
      </section>

      {!example && (
        <section className="card hairline">
          <h2 className="font-display font-semibold text-lg mb-3">Photo du plat</h2>
          <ul className="grid grid-cols-3 gap-2">
            {photos.map(id => (
              <li key={id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite */}
                <img src={photoUrl(recipeId, id)} alt="" className="w-full aspect-square object-cover rounded-2xl bg-coconut" />
              </li>
            ))}
            <li>
              <label className="w-full aspect-square rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-sm text-ink-muted hover:bg-coconut cursor-pointer">
                <Icon name="camera" />
                {pending ? 'Envoi…' : 'Ajouter'}
                <input type="file" accept="image/*" className="sr-only" disabled={pending} onChange={e => { addPhoto(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            </li>
          </ul>
          {error && <p role="alert" className="text-sm text-pink-deep mt-2">{error}</p>}
        </section>
      )}

      <ActionBar detached>
        <Link href={`/recipes/${recipeId}`} onClick={state.save} className={`btn-feature btn-lg w-full ${FEATURES.recipes.fill}`}>
          Retour à la recette
        </Link>
      </ActionBar>
    </div>
  )
}
