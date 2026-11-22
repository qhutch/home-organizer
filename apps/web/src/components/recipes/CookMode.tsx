'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import Emoji from '@/components/ui/Emoji'
import IngredientTile, { ingredientGrid, ingredientGridLarge } from '@/components/recipes/IngredientTile'
import { ReviewFields, useReview, type Review } from '@/components/recipes/RecipeReview'
import { FEATURES } from '@/lib/ui/features'
import { scaleIngredients } from '@/lib/recipes/ingredients'
import { equipmentEmoji } from '@/lib/recipes/equipment'
import KitchenTip from '@/components/recipes/KitchenTip'
import { stepParts, stepTimers } from '@/lib/recipes/cook'
import { TimerTray, useTimers } from '@/components/recipes/CookTimers'
import { photoUrl, shrinkPhoto } from '@/lib/recipes/photo'
import { addRecipePhoto, recordCooking } from '@/app/(app)/recipes/actions'
import StepPhotoBlock from '@/components/recipes/StepPhoto'
import type { RecipeIngredient, StepPhoto } from '@/types/database'

// Mode cuisine : d'abord le matériel à sortir (s'il y en a), les ingrédients (et le nombre de personnes), puis une étape par écran : sa photo
// en grand en haut, puis le texte avec les quantités des ingrédients cités et un minuteur pour chaque durée.
// Tout est en très gros (texte, boutons btn-xl / icon-btn-xl), pour se lire de loin, et l'écran reste allumé.
// But : une étape tient sur l'écran d'un téléphone sans défiler.
// « C'est prêt » range la recette dans l'historique, puis propose note, commentaire et photo.

// `label` : ce que le minuteur chronomètre, tiré du texte de l'étape (« Laisse cuire à feu moyen »)
// Largeur du mode cuisine : centré, et aligné sur la barre du bas (max-w-lg, 32rem) une fois retirées
// les marges de page-wrap (1rem de chaque côté) — sur téléphone comme sur grand écran.
export const COOK_WIDTH = 'w-full max-w-[34rem] mx-auto'

export { TimerTray, useTimers } from '@/components/recipes/CookTimers'

export default function CookMode({
  recipeId,
  title,
  servings,
  initialPeople,
  ingredients,
  equipment,
  kitchenTip,
  steps,
  review,
  stepPhotos,
}: {
  recipeId: string
  title: string
  servings: number
  initialPeople: number
  ingredients: RecipeIngredient[]
  equipment: string[]
  kitchenTip: string | null
  steps: string[]
  review: Review
  stepPhotos: StepPhoto[]
}) {
  const [photos, setPhotos] = useState(stepPhotos)
  const [people, setPeople] = useState(initialPeople)
  // 0 : les ingrédients ; 1 à steps.length : les étapes ; après : c'est prêt
  const [screen, setScreen] = useState(0)
  // Avant les ingrédients : le matériel à sortir
  const [gathering, setGathering] = useState(equipment.length > 0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const timers = useTimers()
  useWakeLock()
  useSnapToSteps(screen >= 1 && screen <= steps.length)

  const shown = scaleIngredients(ingredients, servings, people)
  const ratio = people / servings
  const done = screen > steps.length

  function go(next: number) {
    // Avant les ingrédients, on revient au matériel
    if (next < 0 && equipment.length) setGathering(true)
    setScreen(Math.max(0, Math.min(steps.length + 1, next)))
    window.scrollTo({ top: 0 })
  }

  // Flèches du clavier (tablette, ordinateur)
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

  if (done) return <Finished recipeId={recipeId} title={title} people={people} review={review} />

  if (gathering) {
    return (
      <div className={`page-wrap !pt-3 !pb-0 -mb-24 ${COOK_WIDTH}`}>
        <p className="eyebrow mb-2 truncate">{title}</p>
        <h1 className="text-3xl leading-tight mb-1">Matériel</h1>
        <p className="text-ink-muted mb-5">Sors tout avant de commencer, ce sera plus simple pendant la recette.</p>
        <EquipmentList equipment={equipment} />
        {kitchenTip && <div className="mt-3"><KitchenTip tip={kitchenTip} large /></div>}
        <CookBar tray={<TimerTray timers={timers} step={null} durations={[]} />}>
          <button type="button" onClick={() => { setGathering(false); window.scrollTo({ top: 0 }) }} className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
            Suivant <Icon name="chevronRight" />
          </button>
        </CookBar>
      </div>
    )
  }

  return (
    // -mb-24 annule la marge du bas de <main> : la barre, collée en bas, y reste jusqu'au bout
    <div className={`page-wrap !pt-3 !pb-0 -mb-24 ${COOK_WIDTH}`}>
      {/* Point d'arrêt de l'aimant : le haut de la page (voir useSnapToSteps) */}
      {screen >= 1 && <div aria-hidden="true" className="absolute top-0 left-0 w-px h-px snap-start" />}
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
            />
          }
        />
      )}

      {/* En faisant défiler sous l'étape : toutes les étapes, pour la vue d'ensemble */}
      {screen >= 1 && <AllSteps steps={steps.map(text => ({ text, ingredients: shown, ratio }))} current={screen} onPick={n => go(n)} />}

      <CookBar tray={<TimerTray timers={timers} step={screen >= 1 ? screen : null} durations={screen >= 1 ? stepTimers(steps[screen - 1]) : []} />}>
        {screen === 0 ? (
          <button type="button" onClick={() => go(1)} className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
            {steps.length ? 'Commencer' : 'C’est prêt'} <Icon name={steps.length ? 'chevronRight' : 'check'} />
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

      {sheetOpen && (
        <IngredientsSheet onClose={() => setSheetOpen(false)}>
          <People people={people} onChange={setPeople} large />
          <IngredientGrid ingredients={shown} large />
        </IngredientsSheet>
      )}
    </div>
  )
}

// Le matériel à sortir avant de commencer : une ligne par ustensile, rien à cocher
export function EquipmentList({ equipment }: { equipment: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {equipment.map(name => (
        <li key={name} className="flex items-center gap-3 rounded-3xl bg-surface hairline p-3 pr-4 text-lg font-semibold">
          <Emoji name={equipmentEmoji(name)} size={40} />
          <span className="flex-1 min-w-0">{name}</span>
        </li>
      ))}
    </ul>
  )
}

// Une étape, en grand : sa photo en haut, puis le texte avec les quantités des ingrédients cités en rose.
// Ses minuteurs sont dans la barre du bas, au-dessus de « Étape suivante » (CookBar, TimerTray).
export function Step({
  number,
  count,
  heading,
  text,
  next,
  ingredients,
  ratio,
  onIngredients,
  photo,
}: {
  number: number
  count: number
  // À la place de « Étape 2 sur 5 » (batch cooking : « Fondue aux poireaux · étape 2 sur 4 »)
  heading?: React.ReactNode
  text: string
  // Le texte de l'étape suivante (null à la dernière)
  next: string | null
  ingredients: RecipeIngredient[]
  ratio: number
  // Ouvre la liste des ingrédients (fiche du bas)
  onIngredients: () => void
  // La photo de l'étape (ou la case pour en ajouter une)
  photo: React.ReactNode
}) {
  const parts = stepParts(text, ingredients, ratio)
  const [fitRef, fitStyle] = useFitHeight()
  const scrolled = useScrolled()
  // Une étape très longue qui ne tient pas (sous la barre, on ne la verrait plus) : texte un cran plus petit
  const [small, setSmall] = useState(false)
  useEffect(() => {
    const section = fitRef.current
    if (!section || small) return
    // La hauteur de l'étape change avec celle de la barre du bas (minuteurs) : on revérifie à chaque fois
    const observer = new ResizeObserver(() => {
      if (section.scrollHeight > section.clientHeight + 1) setSmall(true)
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [fitRef, small])
  return (
    // L'étape prend exactement la hauteur libre au-dessus de la barre du bas (minuteurs compris) :
    // texte en bas, et la photo prend ce qui reste (elle rétrécit plutôt que de cacher le texte).
    <section aria-live="polite" ref={fitRef} style={fitStyle} className="flex flex-col min-h-0">
      {photo}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="font-display font-semibold text-xl text-pink-deep min-w-0">{heading ?? <>Étape {number} sur {count}</>}</h1>
        <button type="button" onClick={onIngredients} className={`btn-feature-outline btn-sm shrink-0 ${FEATURES.recipes.text}`}>
          <Icon name="carrot" /> Ingrédients
        </button>
      </div>
      {/* Même taille pour toutes les étapes (24px) ; la photo rétrécit pour laisser la place au texte */}
      <p className={`${small ? 'text-xl' : 'text-2xl'} leading-snug text-pretty`}>
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
      </div>
    </section>
  )
}

// Toutes les étapes, sous l'étape en cours (on y arrive en faisant défiler) : l'étape en cours sur fond
// rose doux, celles déjà faites estompées. On touche une étape pour y aller.
// `recipe` : batch cooking, le nom de la recette de chaque étape, au-dessus de son texte.
export function AllSteps({
  steps,
  current,
  onPick,
}: {
  steps: { text: string; ingredients: RecipeIngredient[]; ratio: number; recipe?: string }[]
  // Numéro de l'étape affichée (à partir de 1)
  current: number
  onPick: (number: number) => void
}) {
  return (
    // snap-start + scroll-mt-6 : point d'arrêt de l'aimant. Au moins la hauteur de l'écran, pour qu'une
    // liste courte puisse monter tout en haut, avec du vide en dessous plutôt qu'au-dessus.
    // pb-32 : la dernière étape reste au-dessus de la barre du bas.
    <section className="mt-36 pb-32 snap-start scroll-mt-6 min-h-[calc(100dvh-1.5rem)]" aria-labelledby="all-steps-title">
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
                  {step.recipe && <span className="block text-sm font-semibold text-pink-deep">{step.recipe}</span>}
                  {stepParts(step.text, step.ingredients, step.ratio).map((p, j) => (
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

export function IngredientGrid({ ingredients, large = false }: { ingredients: RecipeIngredient[]; large?: boolean }) {
  if (!ingredients.length) return <p className={`card hairline text-ink-muted ${large ? 'text-lg' : 'text-sm'}`}>Pas d’ingrédients notés.</p>
  return (
    <div className={large ? ingredientGridLarge : ingredientGrid}>
      {ingredients.map((ing, i) => <IngredientTile key={i} ingredient={ing} large={large} />)}
    </div>
  )
}

export function IngredientsSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="ingredients-title">
      <button type="button" aria-label="Fermer" onClick={onClose} data-veil className="absolute inset-0 bg-ink/40" />
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

// La barre du bas du mode cuisine, collée en bas de l'écran (dans la page plutôt que posée par-dessus :
// elle a ainsi toujours la largeur du contenu) : les minuteurs, puis les boutons. On ne peut pas faire
// défiler la page sous les minuteurs : ils restent accrochés au-dessus de « Étape suivante ». Sa hauteur
// est gardée dans --cook-bar, pour que l'étape tienne au-dessus (useFitHeight).
export function CookBar({ tray, children }: { tray: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const bar = ref.current
    if (!bar) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => root.style.setProperty('--cook-bar', `${bar.offsetHeight}px`))
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--cook-bar')
    }
  }, [])
  return (
    <div ref={ref} className="sticky bottom-0 z-40 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {tray}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

// Aimant entre l'étape et « Toutes les étapes » : l'aimant du navigateur (scroll snap), qui suit le geste
// et son élan sans à-coup. Deux points d'arrêt : le haut de la page (repère en haut de CookMode) et le
// titre de la liste (AllSteps). « mandatory » : on ne s'arrête jamais dans l'espace vide entre les deux ;
// dans la liste, plus haute que l'écran, on défile librement.
export function useSnapToSteps(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    const before = root.style.scrollSnapType
    root.style.scrollSnapType = 'y mandatory'
    return () => {
      root.style.scrollSnapType = before
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

// Hauteur libre entre le haut de l'élément et la barre du bas (sa hauteur, minuteurs compris, est
// mesurée par CookBar dans --cook-bar), moins 0,5rem d'écart : l'écran d'une étape tient ainsi sans
// défiler. Recalculée quand la fenêtre change de taille.
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
    : { height: `calc(100dvh - ${top}px - var(--cook-bar, 6rem) - 0.5rem)` }
  return [ref, style] as const
}

// Garde l'écran allumé pendant qu'on cuisine ; redemandé quand on revient sur l'app.
export function useWakeLock() {
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
function Finished({ recipeId, title, people, review }: { recipeId: string; title: string; people: number; review: Review }) {
  const state = useReview(recipeId, review)
  const [photos, setPhotos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const recorded = useRef(false)

  useEffect(() => {
    if (recorded.current) return
    recorded.current = true
    void recordCooking(recipeId, people)
  }, [recipeId, people])

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

      <ActionBar detached>
        <Link href={`/recipes/${recipeId}`} onClick={state.save} className={`btn-feature btn-xl w-full ${FEATURES.recipes.fill}`}>
          Retour à la recette
        </Link>
      </ActionBar>
    </div>
  )
}
