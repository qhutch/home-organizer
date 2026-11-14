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
  [/\b(saladiers?|bols?|culs? de poule|ramequins?|assiettes?)\b/, 'bowl_with_spoon'],
  [/\b(blenders?|mixeurs?|batteurs?|robots?)\b/, 'electric_plug'],
  [/\b(cuilleres?|louches?|spatules?|ecumoires?|fouets?|maryses?)\b/, 'spoon'],
  [/\b(passoires?|chinois)\b/, 'bowl_with_spoon'],
  [/\bcuit-vapeur\b/, 'pot_of_food'],
  [/\b(economes?|mandolines?)\b/, 'kitchen_knife'],
  [/\bpinceaux?\b/, 'paintbrush'],
  [/\bfourchettes?\b/, 'fork_and_knife'],
  [/\b(film|papier|essuie)/, 'roll_of_paper'],
  [/\b(plans? de travail|planches?|rouleaux? a patisserie)\b/, 'wood'],
  [/\b(grilles?|barbecues?|braises?)\b/, 'fire'],
  [/\b(fours?|chalumeaux?)\b/, 'fire'],
  [/\bminuteurs?\b/, 'timer_clock'],
  [/\bthermometres?\b/, 'thermometer'],
  [/\b(bocal|bocaux|pots?)\b/, 'jar'],
  [/\b(verres?|doseurs?)\b/, 'tumbler_glass'],
  [/\btorchons?\b/, 'sponge'],
  [/\bcouvercles?\b/, 'pot_of_food'],
  [/\b(tasses?|mugs?)\b/, 'teacup_without_handle'],
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

// Matériel deviné d'après les étapes (« enfournez », « fouettez », « dans une casserole »…),
// pour une recette lue depuis un lien qui ne donne pas son matériel.
const FROM_STEPS: [RegExp, string][] = [
  [/\b(four|enfourn\w*)\b/, 'Four'],
  [/\bplats? (a four|a gratin|allant au four)\b/, 'Plat à four'],
  [/\b(ramequins?|plats? a oeufs)\b/, 'Ramequins'],
  [/\bmoules?\b/, 'Moule'],
  [/\bplaques?\b/, 'Plaque de four'],
  [/\bcasseroles?\b/, 'Casserole'],
  [/\b(poeles?|poelez|poeler)\b/, 'Poêle'],
  [/\bsauteuses?\b/, 'Sauteuse'],
  [/\bwoks?\b/, 'Wok'],
  [/\bcocottes?\b/, 'Cocotte'],
  [/\b(faitouts?|marmites?)\b/, 'Faitout'],
  [/\b(saladiers?|jattes?|culs? de poule|terrines?)\b/, 'Saladier'],
  [/\bbols?\b/, 'Bol'],
  [/\bbatteurs?\b/, 'Batteur électrique'],
  [/\b(fouet\w*)\b/, 'Fouet'],
  [/\b(mix(ez|er|eur|eurs)|blenders?)\b/, 'Mixeur'],
  [/\brobots?\b/, 'Robot'],
  [/\b(coup(ez|er|e)|emin?c\w*|hach\w*|cisel\w*|tranch(ez|er)|detaill\w*|fend(ez|re)|epepin\w*|couteaux?)\b/, 'Couteau'],
  [/\b(epluch(ez|er)|pel(ez|er)|economes?)\b/, 'Économe'],
  [/\b(rap(ez|er|e|ee|ees|es))\b/, 'Râpe'],
  [/\b(egoutt\w*|passoires?)\b/, 'Passoire'],
  [/\b(tamis\w*)\b/, 'Tamis'],
  [/\bchinois\b/, 'Chinois'],
  [/\b(spatules?|maryses?)\b/, 'Spatule'],
  [/\blouches?\b/, 'Louche'],
  [/\b(rouleau a patisserie|etal(ez|er) la pate)\b/, 'Rouleau à pâtisserie'],
  [/\bpapier (cuisson|sulfurise)\b/, 'Papier cuisson'],
  [/\bfilm (alimentaire|etirable)\b/, 'Film alimentaire'],
  [/\b(pinceau\w*|badigeonn\w*)\b/, 'Pinceau'],
  [/\b(mortiers?|pilons?)\b/, 'Mortier'],
  [/\bchalumeaux?\b/, 'Chalumeau'],
  [/\bbarbecues?\b/, 'Barbecue'],
  [/\b(cuit-vapeur|a la vapeur)\b/, 'Cuit-vapeur'],
]

export function guessEquipment(steps: string[]): string[] {
  const text = normalize(steps.join(' ')).replace(/œ/g, 'oe')
  return FROM_STEPS.filter(([pattern]) => pattern.test(text)).map(([, name]) => name)
}
