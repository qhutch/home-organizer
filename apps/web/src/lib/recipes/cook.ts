import { formatQuantity, scaleQuantity } from '@/lib/recipes/ingredients'
import type { RecipeIngredient } from '@/types/database'

// Mode cuisine : les quantités des ingrédients écrites dans le texte des étapes,
// recalculées pour le nombre de personnes, et les durées qui deviennent des minuteurs.

// Un morceau du texte d'une étape. `amount` : la quantité à afficher juste après (« châtaignes (200 g) »).
// `scaled` : un nombre déjà écrit dans l'étape (« 200 g de farine »), recalculé pour le nombre de personnes.
export type StepPart = { text: string; amount?: string; scaled?: boolean }

// Minuscules et sans accents, lettre par lettre : le texte garde sa longueur,
// donc une position trouvée dans le texte simplifié vaut aussi dans le texte d'origine.
function fold(text: string) {
  return [...text].map(c => (c === '’' ? "'" : c.toLowerCase().normalize('NFD')[0] ?? c)).join('')
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// « châtaignes cuites » → motif qui accepte singulier et pluriel de chaque mot
function namePattern(words: string[]) {
  return words
    .map(w => (w.length > 3 ? `${escape(w.replace(/(es|s|x)$/, ''))}(?:es|s|x)?` : escape(w)))
    .join("[\\s'-]+")
}

const words = (name: string) => fold(name).split(/[\s'-]+/).filter(Boolean)

// Ce qui précède le nom de l'ingrédient : « la moitié du beurre » → la moitié de la quantité.
// `null` : une partie qu'on ne sait pas chiffrer (« le reste des châtaignes ») → on n'affiche rien.
const SHARES: [RegExp, number | null][] = [
  [/(trois quarts?|3\/4) (de la |du |des |de l'|d')$/, 0.75],
  [/(moitie|1\/2) (de la |du |des |de l'|d')$/, 0.5],
  [/(tiers|1\/3) (de la |du |des |de l'|d')$/, 1 / 3],
  [/(quart|1\/4) (de la |du |des |de l'|d')$/, 0.25],
  [/(reste|restant|restante|restants|restantes|autre moitie|un peu) (de la |du |des |de l'|d')$/, null],
]

// Un nombre déjà écrit juste avant le nom : « 200 g de farine », « 2 œufs », « 10 cl de crème ».
const WRITTEN = /(\d+(?:[.,]\d+)?)(\s*(?:[a-z.]{1,12}\s+)?(?:de |d')?(?:la |le |les |l')?)$/

function amountOf(ing: RecipeIngredient, share = 1) {
  if (ing.quantity === null) return null
  const q = scaleQuantity(ing.quantity, share)
  // Une seule pièce sans unité (« l'oignon (1) ») n'apprend rien
  if (!ing.unit && q === 1) return null
  return [formatQuantity(q), ing.unit].filter(Boolean).join(' ')
}

// Le texte d'une étape, découpé pour afficher la quantité de chaque ingrédient cité.
// `ingredients` : déjà recalculés pour le nombre de personnes ; `ratio` : personnes / personnes de la recette.
export function stepParts(step: string, ingredients: RecipeIngredient[], ratio: number): StepPart[] {
  const folded = fold(step)
  const firstWords = ingredients.map(i => words(i.name)[0] ?? '')

  // Pour chaque ingrédient, son nom entier, puis son premier mot s'il ne désigne que lui
  // (« le beurre » pour « beurre froid », mais pas « la crème » s'il y a deux crèmes).
  const found: { start: number; end: number; ing: RecipeIngredient }[] = []
  ingredients.forEach((ing, i) => {
    const all = words(ing.name)
    if (!all.length) return
    const keys = [all]
    const first = firstWords[i]
    if (all.length > 1 && first.length >= 3 && firstWords.filter(w => w === first).length === 1) keys.push([first])
    for (const key of keys) {
      const match = new RegExp(`(?<![a-z0-9œæ])${namePattern(key)}(?![a-z0-9œæ])`).exec(folded)
      if (!match) continue
      const start = match.index
      const end = start + match[0].length
      if (!found.some(f => start < f.end && end > f.start)) found.push({ start, end, ing })
      return
    }
  })
  found.sort((a, b) => a.start - b.start)

  const parts: StepPart[] = []
  let at = 0
  for (const { start, end, ing } of found) {
    const before = folded.slice(Math.max(at, start - 30), start)
    const written = WRITTEN.exec(before)
    if (written && ratio !== 1) {
      // Le nombre est déjà dans la phrase : on le recalcule à sa place
      const numberStart = start - before.length + written.index
      parts.push({ text: step.slice(at, numberStart) })
      parts.push({ text: formatQuantity(scaleQuantity(parseFloat(written[1].replace(',', '.')), ratio)), scaled: true })
      parts.push({ text: step.slice(numberStart + written[1].length, end) })
    } else if (written) {
      parts.push({ text: step.slice(at, end) })
    } else {
      const share = SHARES.find(([re]) => re.test(before))
      const amount = share ? (share[1] === null ? null : amountOf(ing, share[1])) : amountOf(ing)
      parts.push({ text: step.slice(at, end), ...(amount ? { amount } : {}) })
    }
    at = end
  }
  parts.push({ text: step.slice(at) })
  return parts.filter(p => p.text || p.amount)
}

// Nom d'un minuteur : le morceau de phrase qui contient la durée, sans elle.
// « Émince l'oignon et fais-le revenir 5 minutes dans le beurre » → « Fais-le revenir dans le beurre ».
const MAX_LABEL_WORDS = 6

function timerLabel(step: string, start: number, end: number) {
  const cut = /[.;:!?,()]|\s(?:puis|et|ou|jusqu'à|jusqu’à|en)\s/g
  let from = 0
  let to = step.length
  // Le morceau d'avant, s'il est dans la même phrase
  let previous: string | null = null
  for (const m of step.matchAll(cut)) {
    const at = m.index ?? 0
    if (at + m[0].length <= start) {
      previous = /[.;:!?]/.test(m[0]) ? null : step.slice(from, at).trim()
      from = at + m[0].length
    } else if (at >= end) { to = at; break }
  }
  const clean = (text: string) => text
    .replace(/(^|\s)(environ|pendant|durant|encore|à peu près)(?=\s|$)/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
  let words = clean(`${step.slice(from, start)} ${step.slice(end, to)}`)
  // Un seul mot (« remue ») ne dit pas sur quoi : « Ajoute le riz et remue »
  const before = previous ? clean(previous) : []
  if (words.length === 1 && before.length && before.length <= MAX_LABEL_WORDS - 2) words = [...before, 'et', words[0].toLowerCase()]
  if (!words.length) return null
  const label = words.slice(0, MAX_LABEL_WORDS).join(' ') + (words.length > MAX_LABEL_WORDS ? '…' : '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export type StepTimer = { seconds: number; label: string | null }

// Les durées d'une étape, en secondes : « 25 minutes », « 1 h 30 », « 15 à 20 min » (la plus courte),
// chacune avec son nom.
export function stepTimers(step: string): StepTimer[] {
  const folded = fold(step)
  const timers: StepTimer[] = []
  // Les heures (« 1 h 30 », « 2 heures ») ou les minutes et secondes (« 15 à 20 minutes »)
  const re = /(\d+)\s*(?:h|heures?)(?:\s*(\d{1,2})(?:\s*(?:min(?:utes?)?|mn))?)?(?![a-z])|(\d+)(?:\s*(?:a|-|ou)\s*\d+)?\s*(min(?:utes?)?|mn|secondes?|sec)(?![a-z])/g
  for (const m of folded.matchAll(re)) {
    const total = m[1]
      ? Number(m[1]) * 3600 + Number(m[2] ?? 0) * 60
      : Number(m[3]) * (m[4].startsWith('s') ? 1 : 60)
    if (total > 0 && total <= 24 * 3600 && !timers.some(t => t.seconds === total)) {
      const start = m.index ?? 0
      timers.push({ seconds: total, label: timerLabel(step, start, start + m[0].length) })
    }
  }
  return timers
}

// « 25 min », « 1 h 30 », « 45 s »
export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

// Compte à rebours : « 24:05 », « 1:02:30 »
export function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`
}
