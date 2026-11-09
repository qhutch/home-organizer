import { normalize } from '@/lib/shopping/catalog'
import type { RecipeIngredient } from '@/types/database'

// Unités reconnues en début de ligne (« 200 g farine », « 2 c. à soupe d'huile »).
const UNITS = [
  'kg', 'g', 'mg', 'l', 'cl', 'dl', 'ml',
  'c. à soupe', 'c. à café', 'c.à.s', 'c.à.c', 'cs', 'cc', 'cuillères à soupe', 'cuillère à soupe', 'cuillères à café', 'cuillère à café',
  'pincées', 'pincée', 'gousses', 'gousse', 'tranches', 'tranche', 'boîtes', 'boîte', 'sachets', 'sachet', 'verres', 'verre', 'brins', 'brin', 'bottes', 'botte',
  'barquettes', 'barquette', 'feuilles', 'feuille', 'branches', 'branche', 'tasses', 'tasse', 'poignées', 'poignée',
  'cubes', 'cube', 'paquets', 'paquet', 'pots', 'pot', 'bocaux', 'bocal', 'filets', 'filet', 'zestes', 'zeste',
]

const UNITS_LONGEST_FIRST = [...UNITS].sort((a, b) => b.length - a.length)

function parseNumber(text: string): number | null {
  const fraction = text.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const n = parseFloat(text.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Une ligne de texte → un ingrédient. « 3 oignons » → 3 / – / oignons.
export function parseIngredientLine(line: string): RecipeIngredient | null {
  let rest = line.trim().replace(/^[-•*]\s*/, '')
  if (!rest) return null

  let quantity: number | null = null
  const number = rest.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)\s*/)
  if (number) {
    quantity = parseNumber(number[1])
    rest = rest.slice(number[0].length)
  }

  let unit: string | null = null
  if (quantity !== null) {
    const lower = rest.toLowerCase()
    // L'unité doit être suivie d'un espace (« 2 grosses tomates » n'a pas d'unité « g »)
    const found = UNITS_LONGEST_FIRST.find(u => lower.startsWith(u) && /^(\s|$)/.test(lower.slice(u.length)))
    if (found) {
      unit = rest.slice(0, found.length)
      rest = rest.slice(found.length).trimStart()
    }
  }
  // « de farine », « d'huile » après une quantité
  if (quantity !== null) rest = rest.replace(/^(de\s+|d['’])/i, '')

  const name = rest.trim().slice(0, 80)
  if (!name) return null
  return { name, quantity, unit }
}

export function formatQuantity(quantity: number) {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

// « 20 cl de crème », « 1 c. à soupe d'huile », « 2 oignons »
export function formatIngredient({ name, quantity, unit }: RecipeIngredient) {
  const amount = [quantity !== null ? formatQuantity(quantity) : null, unit].filter(Boolean).join(' ')
  if (!amount) return name
  if (!unit) return `${amount} ${name}`
  return /^[aeiouyhéèêâîôû]/i.test(name) ? `${amount} d’${name}` : `${amount} de ${name}`
}

// Quantité recalculée pour un autre nombre de personnes, arrondie pour rester lisible.
export function scaleQuantity(quantity: number, ratio: number) {
  const q = quantity * ratio
  if (q >= 10) return Math.round(q)
  if (q >= 1) return Math.round(q * 10) / 10
  return Math.round(q * 100) / 100
}

// Les ingrédients d'une recette pour `people` personnes au lieu de `servings`.
export function scaleIngredients(ingredients: RecipeIngredient[], servings: number, people: number) {
  const ratio = people / servings
  return ingredients.map(i => (i.quantity !== null ? { ...i, quantity: scaleQuantity(i.quantity, ratio) } : i))
}

// Ce qu'on a toujours dans la cuisine : décoché d'office dans « Ajouter aux courses ».
// Comparé au début du nom normalisé (« Huile d'olive », « Poivre du moulin », « Sel fin »…).
const PANTRY = ['sel', 'poivre', 'eau', 'huile', 'vinaigre', 'sucre']

export function isPantryStaple(name: string) {
  const n = normalize(name)
  return PANTRY.some(p => n === p || n.startsWith(`${p} `))
}
