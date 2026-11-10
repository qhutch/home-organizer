// Matériel d'une recette (casserole, mortier…) : un nom libre par ustensile, avec un emoji Fluent deviné.

// Un ustensile, sur la fiche et dans le formulaire : pilule crème avec son emoji
export const equipmentPill = 'inline-flex items-center gap-2 rounded-full bg-surface hairline pl-2 pr-3 py-1.5 text-sm font-semibold'

const MAX_ITEMS = 30
const MAX_LENGTH = 60

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Premier motif trouvé dans le nom → emoji de public/emoji
const EMOJIS: [RegExp, string][] = [
  [/\b(poeles?|woks?|sauteuses?)\b/, 'cooking'],
  [/\b(casseroles?|marmites?|cocottes?|faitouts?)\b/, 'pot_of_food'],
  [/\b(plats?|moules?)\b/, 'shallow_pan_of_food'],
  [/\b(couteaux?|hachoirs?)\b/, 'kitchen_knife'],
  [/\brapes?\b/, 'cheese_wedge'],
  [/\b(mortiers?|pilons?)\b/, 'rock'],
  [/\bciseaux\b/, 'scissors'],
  [/\b(saladiers?|bols?|culs? de poule)\b/, 'bowl_with_spoon'],
  [/\b(cuilleres?|louches?|spatules?|ecumoires?|fouets?)\b/, 'spoon'],
  [/\bfourchettes?\b/, 'fork_and_knife'],
  [/\b(film|papier|essuie)/, 'roll_of_paper'],
  [/\b(plans? de travail|planches?|rouleaux? a patisserie)\b/, 'wood'],
  [/\b(fours?|chalumeaux?)\b/, 'fire'],
  [/\bminuteurs?\b/, 'timer_clock'],
  [/\bthermometres?\b/, 'thermometer'],
  [/\b(bocaux?|pots?)\b/, 'jar'],
  [/\b(verres?|doseurs?)\b/, 'tumbler_glass'],
  [/\btorchons?\b/, 'sponge'],
]

export function equipmentEmoji(name: string) {
  const n = normalize(name)
  return EMOJIS.find(([pattern]) => pattern.test(n))?.[1] ?? 'fork_and_knife_with_plate'
}

// Noms nettoyés, sans doublon (« Poêle » et « poele » comptent pour un), dans l'ordre
export function cleanEquipment(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of list) {
    if (typeof value !== 'string') continue
    const name = value.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH)
    const key = normalize(name)
    if (!name || seen.has(key)) continue
    seen.add(key)
    result.push(name.charAt(0).toUpperCase() + name.slice(1))
    if (result.length === MAX_ITEMS) break
  }
  return result
}

export function sameEquipment(a: string, b: string) {
  return normalize(a.trim()) === normalize(b.trim())
}
