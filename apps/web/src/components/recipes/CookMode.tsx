'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid, ingredientGridLarge } from '@/components/recipes/IngredientTile'
import { ReviewFields, useReview, type Review } from '@/components/recipes/RecipeReview'
import { FEATURES } from '@/lib/ui/features'
import { scaleIngredients } from '@/lib/recipes/ingredients'
import { formatCountdown, formatDuration, stepParts, stepTimers, type StepTimer } from '@/lib/recipes/cook'
import { photoUrl, shrinkPhoto } from '@/lib/recipes/photo'
import { addRecipePhoto, recordCooking } from '@/app/(app)/recipes/actions'
import StepPhotoBlock from '@/components/recipes/StepPhoto'
import type { RecipeIngredient, StepPhoto } from '@/types/database'

// Mode cuisine : d'abord les ingrédients (et le nombre de personnes), puis une étape par écran : sa photo
// en grand en haut, puis le texte avec les quantités des ingrédients cités et un minuteur pour chaque durée.
// Tout est en très gros (texte, boutons btn-xl / icon-btn-xl), pour se lire de loin, et l'écran reste allumé.
// But : une étape tient sur l'écran d'un téléphone sans défiler.
// « C'est prêt » range la recette dans l'historique, puis propose note, commentaire et photo.

// `label` : ce que le minuteur chronomètre, tiré du texte de l'étape (« Laisse cuire à feu moyen »)
// Largeur du mode cuisine : centré, et aligné sur la barre du bas (max-w-lg, 32rem) une fois retirées
// les marges de page-wrap (1rem de chaque côté) — sur téléphone comme sur grand écran.
const COOK_WIDTH = 'w-full max-w-[34rem] mx-auto'

type Timer = { id: number; step: number; seconds: number; label: string | null; endsAt: number }

export default function CookMode({
  recipeId,
  title,
  servings,
  initialPeople,
  ingredients,
  steps,
  example,
  review,
  stepPhotos,
}: {
  recipeId: string
  title: string
  servings: number
  initialPeople: number
  ingredients: RecipeIngredient[]
  steps: string[]
  example: boolean
  review: Review
  stepPhotos: StepPhoto[]
}) {
  const [photos, setPhotos] = useState(stepPhotos)
  const [people, setPeople] = useState(initialPeople)
  // 0 : les ingrédients ; 1 à steps.length : les étapes ; après : c'est prêt
  const [screen, setScreen] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const timers = useTimers()
  useWakeLock()
  useSnapToSteps(screen >= 1 && screen <= steps.length)

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
    // Pendant les étapes, -mb-24 annule la marge du bas de <main> : la barre, collée en bas, y reste jusqu'au bout
    <div className={`page-wrap !pt-3 ${COOK_WIDTH} ${screen === 0 ? 'pb-72' : '!pb-0 -mb-24'}`}>
      <p className="eyebrow mb-2 truncate">{title}</p>

      {/* Avancement : un trait par étape */}
      {steps.length > 0 && (
        <div className="flex gap-1.5 mb-4" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < screen ? 'bg-rose' : 'bg-coconut'}`} />
          ))}
        </div>
      )}

      {screen === 0 ? (
        <>
          {/* La première page garde les tailles habituelles ; le très gros commence aux étapes */}
          <h1 className="text-3xl leading-tight mb-5">Ingrédients</h1>
          <People people={people} onChange={setPeople} />
          <IngredientGrid ingredients={shown} />
        </>
      ) : (
        <Step
          key={screen}
          tray={
            <TimerTray timers={timers} step={screen} durations={stepTimers(steps[screen - 1])} />
          }
          number={screen}
          count={steps.length}
          text={steps[screen - 1]}
          next={steps[screen] ?? null}
          ingredients={shown}
          ratio={ratio}
          onIngredients={() => setSheetOpen(true)}
          photo={
            <StepPhotoBlock
              recipeId={recipeId}
              step={screen - 1}
              photo={photos.findLast(p => p.step === screen - 1) ?? null}
              onChange={photo => setPhotos(p => [...p.filter(x => x.step !== screen - 1), ...(photo ? [photo] : [])])}
              readOnly={example}
            />
          }
        />
      )}

      {/* En faisant défiler sous l'étape : toutes les étapes, pour la vue d'ensemble */}
      {screen >= 1 && <AllSteps steps={steps} current={screen} ingredients={shown} ratio={ratio} onPick={n => go(n)} />}

      {/* Sur la page des ingrédients, les minuteurs déjà lancés flottent au-dessus de la barre */}
      {screen === 0 && <TimerTray timers={timers} step={null} durations={[]} floating />}

      {screen === 0 ? (
        <ActionBar detached>
          <button type="button" onClick={() => go(1)} className={`btn-feature btn-lg w-full ${FEATURES.recipes.fill}`}>
            {steps.length ? 'Commencer' : 'C’est prêt'} <Icon name={steps.length ? 'chevronRight' : 'check'} />
          </button>
        </ActionBar>
      ) : (
        // Pendant les étapes, la barre est dans la page (collée en bas de l'écran) plutôt que posée
        // par-dessus : elle a ainsi toujours la largeur du contenu, donc celle des minuteurs, quelle que
        // soit la taille de l'écran.
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

      {sheetOpen && (
        <IngredientsSheet onClose={() => setSheetOpen(false)}>
          <People people={people} onChange={setPeople} large />
          <IngredientGrid ingredients={shown} large />
        </IngredientsSheet>
      )}
    </div>
  )
}

// Une étape, en grand : sa photo en haut, puis le texte avec les quantités des ingrédients cités en rose.
// Ses minuteurs sont en bas, au-dessus de « Étape suivante » (TimerTray).
function Step({
  number,
  count,
  text,
  next,
  ingredients,
  ratio,
  onIngredients,
  photo,
  tray,
}: {
  number: number
  count: number
  text: string
  // Le texte de l'étape suivante (null à la dernière)
  next: string | null
  ingredients: RecipeIngredient[]
  ratio: number
  // Ouvre la liste des ingrédients (fiche du bas)
  onIngredients: () => void
  // La photo de l'étape (ou la case pour en ajouter une)
  photo: React.ReactNode
  // Les minuteurs, en bas, juste au-dessus de « Étape suivante »
  tray: React.ReactNode
}) {
  const parts = stepParts(text, ingredients, ratio)
  const [fitRef, fitStyle] = useFitHeight()
  const scrolled = useScrolled()
  return (
    // L'étape prend exactement la hauteur libre au-dessus de la barre du bas : minuteurs en bas,
    // texte au-dessus, et la photo prend ce qui reste (elle rétrécit plutôt que de cacher le texte).
    <section aria-live="polite" ref={fitRef} style={fitStyle} className="flex flex-col min-h-0">
      {photo}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="font-display font-semibold text-xl text-pink-deep">Étape {number} sur {count}</h1>
        <button type="button" onClick={onIngredients} className={`btn-feature-outline ${FEATURES.recipes.text}`}>
          <Icon name="carrot" /> Ingrédients
        </button>
      </div>
      {/* Un texte long passe un peu plus petit, pour que l'étape tienne sur l'écran sans défiler */}
      <p className={`${text.length > 220 ? 'text-xl' : text.length > 120 ? 'text-2xl' : 'text-3xl'} leading-snug text-pretty`}>
        {parts.map((p, i) => (
          <span key={i}>
            {p.scaled ? <strong className="font-semibold text-pink-deep">{p.text}</strong> : p.text}
            {p.amount && <strong className="font-semibold text-pink-deep whitespace-nowrap"> ({p.amount})</strong>}
          </span>
        ))}
      </p>
      <div className="mt-auto pt-4">
        {/* « Ensuite : … » dit ce qui vient et montre qu'il y a la suite plus bas : on le touche pour
            descendre à toutes les étapes. Il s'efface dès qu'on fait défiler. Rien à la dernière étape. */}
        {next && (
          <button
            type="button"
            onClick={() => document.getElementById('all-steps-title')?.scrollIntoView({ behavior: 'smooth' })}
            tabIndex={scrolled ? -1 : undefined}
            aria-hidden={scrolled || undefined}
            className={`w-full flex items-center gap-2 text-lg text-ink-faint text-left hover:text-ink-muted transition-opacity duration-200 ${scrolled ? 'opacity-0 pointer-events-none' : ''}`}
          >
            <Icon name="chevronDown" size={24} className="shrink-0" />
            <span className="truncate"><span className="font-semibold">Ensuite :</span> {next}</span>
          </button>
        )}
        {tray}
      </div>
    </section>
  )
}

// Toutes les étapes, sous l'étape en cours (on y arrive en faisant défiler) : l'étape en cours sur fond
// rose doux, celles déjà faites estompées. On touche une étape pour y aller.
function AllSteps({
  steps,
  current,
  ingredients,
  ratio,
  onPick,
}: {
  steps: string[]
  // Numéro de l'étape affichée (à partir de 1)
  current: number
  ingredients: RecipeIngredient[]
  ratio: number
  onPick: (number: number) => void
}) {
  return (
    <section className="mt-36 pb-4" aria-labelledby="all-steps-title">
      <h2 id="all-steps-title" className="font-display font-semibold text-2xl mb-3 scroll-mt-6">Toutes les étapes</h2>
      <ol className="flex flex-col gap-1">
        {steps.map((step, i) => {
          const number = i + 1
          const isCurrent = number === current
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onPick(number)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`w-full text-left flex gap-3 rounded-3xl p-3 transition-colors ${isCurrent ? FEATURES.recipes.soft : 'hover:bg-coconut/50'} ${number < current ? 'text-ink-muted' : ''}`}
              >
                <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-display font-semibold text-lg ${isCurrent ? FEATURES.recipes.fill : 'bg-surface hairline'}`}>
                  {number < current ? <Icon name="check" size={20} /> : number}
                </span>
                <span className="text-lg leading-snug pt-1">
                  {stepParts(step, ingredients, ratio).map((p, j) => (
                    <span key={j}>
                      {p.scaled ? <strong className="font-semibold text-pink-deep">{p.text}</strong> : p.text}
                      {p.amount && <strong className="font-semibold text-pink-deep whitespace-nowrap"> ({p.amount})</strong>}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// `large` : en très gros (fiche des ingrédients pendant les étapes)
function People({ people, onChange, large = false }: { people: number; onChange: (people: number) => void; large?: boolean }) {
  const step = large ? 'icon-btn icon-btn-lg' : 'icon-btn icon-btn-sm'
  return (
    <div className={`card hairline flex items-center justify-between gap-3 mb-6 ${large ? '!py-2' : '!py-3'}`}>
      <span className={`font-semibold ${large ? 'text-xl' : ''}`}>Personnes</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(1, people - 1))} disabled={people <= 1} aria-label="Une personne de moins" className={step}>
          <Icon name="minus" size={large ? 24 : 18} />
        </button>
        <span className={`font-display font-semibold text-center ${large ? 'text-3xl w-10' : 'text-lg w-7'}`} aria-live="polite">{people}</span>
        <button type="button" onClick={() => onChange(Math.min(50, people + 1))} aria-label="Une personne de plus" className={step}>
          <Icon name="plus" size={large ? 24 : 18} />
        </button>
      </div>
    </div>
  )
}

function IngredientGrid({ ingredients, large = false }: { ingredients: RecipeIngredient[]; large?: boolean }) {
  if (!ingredients.length) return <p className={`card hairline text-ink-muted ${large ? 'text-lg' : 'text-sm'}`}>Pas d’ingrédients notés.</p>
  return (
    <div className={large ? ingredientGridLarge : ingredientGrid}>
      {ingredients.map((ing, i) => <IngredientTile key={i} ingredient={ing} large={large} />)}
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
          <h3 id="ingredients-title" className="font-display font-semibold text-3xl tracking-tight flex-1">Ingrédients</h3>
          <button type="button" onClick={onClose} className="icon-btn icon-btn-lg" aria-label="Fermer"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Au-dessus de « Étape suivante », alignés sur elle et de la même hauteur : les minuteurs en cours
// (quelle que soit l'étape affichée), puis un bouton pour lancer chaque durée de l'étape affichée.
// Une durée déjà lancée n'a plus de bouton : sa pilule la remplace.
// `floating` : posés au-dessus de la barre (page des ingrédients) ; sinon à la fin de l'étape, dans la page.
function TimerTray({ timers, step, durations, floating = false }: { timers: ReturnType<typeof useTimers>; step: number | null; durations: StepTimer[]; floating?: boolean }) {
  const available = step === null ? [] : durations.filter(d => !timers.list.some(t => t.step === step && t.seconds === d.seconds))
  if (!timers.list.length && !available.length) return null
  return (
    <ul
      className={floating
        ? 'fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.75rem)] z-30 flex flex-col items-center gap-2 px-4 pointer-events-none'
        : 'mt-auto pt-4 flex flex-col items-center gap-2'}
      aria-label="Minuteurs"
    >
      {timers.list.map(t => {
        const left = (t.endsAt - timers.now) / 1000
        const ringing = left <= 0
        return (
          <li
            key={t.id}
            role="timer"
            className={`pointer-events-auto w-full max-w-lg rounded-full pl-5 pr-2 py-2 flex items-center gap-3 ${ringing ? `${FEATURES.recipes.fill} motion-safe:animate-pulse` : 'bg-surface hairline'}`}
          >
            <Icon name="timer" size={28} />
            <span className="font-display font-semibold text-3xl tabular-nums">{ringing ? 'Terminé' : formatCountdown(left)}</span>
            <span className="flex-1 min-w-0 leading-tight">
              <span className="block text-base font-semibold line-clamp-2">{t.label ?? `Étape ${t.step}`}</span>
              <span className={`block text-sm ${ringing ? '' : 'text-ink-muted'}`}>Étape {t.step} · {formatDuration(t.seconds)}</span>
            </span>
            <button
              type="button"
              onClick={() => timers.stop(t.id)}
              aria-label={ringing ? 'Arrêter la sonnerie' : 'Arrêter le minuteur'}
              title={ringing ? 'Arrêter la sonnerie' : 'Arrêter le minuteur'}
              className={ringing ? 'icon-btn icon-btn-lg bg-surface text-ink' : 'icon-btn icon-btn-lg'}
            >
              <Icon name={ringing ? 'check' : 'close'} />
            </button>
          </li>
        )
      })}
      {step !== null && available.map(({ seconds, label }) => (
        <li key={`start-${seconds}`} className="pointer-events-auto w-full max-w-lg">
          <button type="button" onClick={() => timers.start(step, seconds, label)} className={`btn-feature-outline btn-xl w-full ${FEATURES.recipes.text}`}>
            <Icon name="timer" /> Minuteur {formatDuration(seconds)}
          </button>
        </li>
      ))}
    </ul>
  )
}

// Aimant entre l'étape et « Toutes les étapes » : quand on lâche le défilement dans l'espace vide
// entre les deux, la page glisse jusqu'à la liste (si on descendait) ou revient en haut de l'étape
// (si on remontait). Plus bas, dans la liste, on défile librement.
function useSnapToSteps(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let lastY = window.scrollY
    let direction = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let snapping = false
    const smooth: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

    function listTop() {
      const title = document.getElementById('all-steps-title')
      if (!title) return null
      // Même marge que quand on touche « Ensuite » (scroll-mt-6)
      return title.getBoundingClientRect().top + window.scrollY - 24
    }

    function settle() {
      const top = listTop()
      const y = window.scrollY
      if (snapping) {
        snapping = false
        return
      }
      if (top === null || y <= 2 || y >= top - 2) return
      snapping = true
      window.scrollTo({ top: direction >= 0 ? top : 0, behavior: smooth })
    }

    function onScroll() {
      const y = window.scrollY
      if (y !== lastY) direction = y > lastY ? 1 : -1
      lastY = y
      clearTimeout(timer)
      // On attend que le défilement s'arrête (le doigt levé et l'élan fini)
      timer = setTimeout(settle, 120)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [enabled])
}

// Vrai dès qu'on a un peu fait défiler la page (pour effacer « Ensuite : … »)
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > threshold)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [threshold])
  return scrolled
}

// Hauteur libre entre le haut de l'élément et la barre du bas (84px + 1rem de marge, + 0,5rem d'écart) :
// l'écran d'une étape tient ainsi sans défiler. Recalculée quand la fenêtre change de taille.
const BAR_SPACE = '6.75rem'

function useFitHeight() {
  const ref = useRef<HTMLElement>(null)
  const [top, setTop] = useState<number | null>(null)
  useLayoutEffect(() => {
    function measure() {
      if (ref.current) setTop(ref.current.getBoundingClientRect().top + window.scrollY)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const style: React.CSSProperties | undefined = top === null
    ? undefined
    : { height: `calc(100dvh - ${top}px - max(1rem, env(safe-area-inset-bottom)) - ${BAR_SPACE} + 1rem)` }
  return [ref, style] as const
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
    start(step: number, seconds: number, label: string | null) {
      // Le son ne peut être préparé que pendant un toucher (règle des navigateurs, surtout sur iPhone)
      try {
        audio.current ??= new AudioContext()
        void audio.current.resume()
      } catch {}
      const start = Date.now()
      setNow(start)
      setList(l => [...l, { id: nextId.current++, step, seconds, label, endsAt: start + seconds * 1000 }])
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
    <div className={`page-wrap pb-32 ${COOK_WIDTH}`}>
      <p className="eyebrow mb-3 truncate">{title}</p>
      <div className="card hairline flex flex-col items-center text-center !py-8 mb-2">
        <span className={`pop-in w-20 h-20 rounded-full flex items-center justify-center mb-5 ${FEATURES.recipes.fill}`} aria-hidden="true">
          <Icon name="recipes" size={44} />
        </span>
        <h1 className="font-display font-semibold text-4xl tracking-tight leading-tight">C’est prêt&nbsp;!</h1>
        <p className="text-xl text-ink-muted mt-2">Bon appétit&nbsp;!</p>
      </div>

      <section className="card hairline flex flex-col gap-5 mb-2">
        <ReviewFields state={state} idPrefix="cook-review" />
      </section>

      {!example && (
        <section className="card hairline">
          <h2 className="font-display font-semibold text-2xl mb-3">Photo du plat</h2>
          <ul className="grid grid-cols-3 gap-2">
            {photos.map(id => (
              <li key={id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite */}
                <img src={photoUrl(recipeId, id)} alt="" className="w-full aspect-square object-cover rounded-2xl bg-coconut" />
              </li>
            ))}
            <li>
              <label className="w-full aspect-square rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-lg font-semibold text-ink-muted hover:bg-coconut cursor-pointer">
                <Icon name="camera" size={28} />
                {pending ? 'Envoi…' : 'Ajouter'}
                <input type="file" accept="image/*" className="sr-only" disabled={pending} onChange={e => { addPhoto(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            </li>
          </ul>
          {error && <p role="alert" className="text-base text-pink-deep mt-2">{error}</p>}
        </section>
      )}

      <ActionBar detached>
        <Link href={`/recipes/${recipeId}`} onClick={state.save} className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
          Retour à la recette
        </Link>
      </ActionBar>
    </div>
  )
}
