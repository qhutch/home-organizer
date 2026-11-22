import { stepTimers } from '@/lib/recipes/cook'

// Mode cuisine du batch cooking : les étapes de toutes les recettes de la semaine en une seule suite,
// pour cuisiner en parallèle. Chaque étape est soit « à la main » (couper, mélanger : on y est occupé),
// soit suivie d'une attente (four, mijoter, tremper : on est libre pendant ce temps). On lance d'abord
// ce qui est long, et pendant qu'une recette cuit on avance les étapes des autres.
// L'ordre des étapes d'une même recette ne change jamais.

export type BatchRecipeInput = { id: string; steps: string[] }

export type BatchStep = {
  recipeId: string
  // Place de l'étape dans recipe.steps (à partir de 0)
  index: number
  text: string
  // Dernière étape de sa recette
  last: boolean
}

export type BatchSchedule = {
  steps: BatchStep[]
  // Durée estimée en cuisinant tout en même temps, et en cuisinant les recettes l'une après l'autre (minutes)
  minutes: number
  separateMinutes: number
}

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'")

// Ce qui se fait tout seul une fois lancé
const PASSIVE = /\b(four|enfourn\w*|mijot\w*|micro-?ondes|trempe\w*|marin\w*|repos\w*|refroidi\w*|au frais|refrigerat\w*|frigo|lever|gonfler|couvr\w*|bouillante|a feu (tres )?doux|cocotte-minute|autocuiseur|mijoteuse|cookeo|airfryer|friteuse a air)\b/
// Préchauffer le four : le temps qu'il chauffe, environ 10 minutes
const PREHEAT = /\bprechauff\w*/
// Ce qui demande de rester à côté, même si ça dure
const HANDS_ON = /\b(en remuant (sans cesse|constamment|regulierement)|sans cesser de remuer|en fouettant)\b/

type Timing = { work: number; wait: number }

// Le temps d'une étape, en minutes : `work` occupé, puis `wait` libre avant la suivante de la même recette.
function timing(text: string): Timing {
  const folded = fold(text)
  const words = folded.split(/\s+/).filter(Boolean).length
  // Lire et faire : environ une minute pour six mots, entre 1 et 10 minutes
  let work = Math.min(10, Math.max(1, Math.round(words / 6)))
  const timers = stepTimers(text)
  const longest = timers.reduce<(typeof timers)[number] | null>((a, t) => (!a || t.seconds > a.seconds ? t : a), null)
  const minutes = (longest?.seconds ?? 0) / 60
  if (PREHEAT.test(folded)) return { work, wait: Math.max(10, minutes) }
  const passive = !HANDS_ON.test(folded) && (minutes >= 8 || PASSIVE.test(folded))
  if (passive) return { work, wait: minutes || 10 }
  // Une petite durée (« dorer 3 à 4 minutes ») : on reste à côté
  work += Math.round(minutes)
  return { work, wait: 0 }
}

// Quand on continue la même recette plutôt que d'en changer (moins d'allers-retours), en minutes
const STAY_BONUS = 6

export function batchSchedule(recipes: BatchRecipeInput[]): BatchSchedule {
  const timings = recipes.map(r => r.steps.map(timing))
  const remaining = (r: number, from: number) => timings[r].slice(from).reduce((s, t) => s + t.work + t.wait, 0)
  const separateMinutes = recipes.reduce((s, _, r) => s + remaining(r, 0), 0)

  const next = recipes.map(() => 0)
  // Moment où la recette peut reprendre (fin de son attente)
  const readyAt = recipes.map(() => 0)
  const steps: BatchStep[] = []
  let now = 0
  let current = -1
  let currentWaits = false

  for (;;) {
    const open = recipes.map((_, r) => r).filter(r => next[r] < recipes[r].steps.length)
    if (!open.length) break
    let ready = open.filter(r => readyAt[r] <= now)
    // Tout cuit : on attend la première qui a fini
    if (!ready.length) {
      now = Math.min(...open.map(r => readyAt[r]))
      ready = open.filter(r => readyAt[r] <= now)
    }
    // La recette qui a le plus de temps devant elle d'abord (ses cuissons longues démarrent tôt)
    const score = (r: number) => remaining(r, next[r]) + (r === current && !currentWaits ? STAY_BONUS : 0)
    const pick = ready.reduce((best, r) => (score(r) > score(best) ? r : best))

    const index = next[pick]
    const t = timings[pick][index]
    steps.push({
      recipeId: recipes[pick].id,
      index,
      text: recipes[pick].steps[index],
      last: index === recipes[pick].steps.length - 1,
    })
    now += t.work
    readyAt[pick] = now + t.wait
    next[pick]++
    current = pick
    currentWaits = t.wait > 0
  }

  const minutes = Math.max(now, ...readyAt)
  return { steps, minutes, separateMinutes }
}
