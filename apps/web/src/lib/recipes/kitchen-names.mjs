// Matériel de cuisine ramené à un nom simple : « 3 bols », « Grand bol », « Bol ou saladier » → Bol (et Saladier).
// En JavaScript pour servir aussi au script de Claude (scripts/kitchen.mjs) ; utilisé par lib/recipes/kitchen.ts.

/** @param {string} text */
export function normalizeKitchen(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim()
}

// Le matériel courant, du plus précis au plus général (le premier motif trouvé l'emporte).
// Aussi la liste montrée sur la page « Matériel de cuisine », même si aucune recette ne le cite.
/** @typedef {'appliances' | 'cooking' | 'tools' | 'other'} KitchenGroup */
// Groupes de la page « Matériel de cuisine », dans l'ordre
/** @type {[KitchenGroup, string][]} */
export const KITCHEN_GROUPS = [
  ['appliances', 'Appareils'],
  ['cooking', 'Cuisson'],
  ['tools', 'Préparation'],
  ['other', 'Divers'],
]

/** @type {[string, RegExp, KitchenGroup][]} */
export const KITCHEN_CATALOG = [
  ['Air fryer', /\bair ?fryers?\b/, 'appliances'],
  ['Friteuse', /\bfriteuses?\b/, 'appliances'],
  ['Robot Companion', /\b(companion|petrir|concasser)\b/, 'appliances'],
  ['Thermomix', /\bthermomix\b/, 'appliances'],
  ['Cookeo', /\bcookeo\b/, 'appliances'],
  ['Mixeur plongeant', /\bmixeurs? plongeants?\b/, 'appliances'],
  ['Blender', /\bblenders?\b/, 'appliances'],
  ['Mixeur', /\b(mixeurs?|robots?)\b/, 'appliances'],
  ['Batteur électrique', /\b(batteurs?|fouets? electriques?)\b/, 'appliances'],
  ['Fouet', /\bfouets?\b/, 'tools'],
  ['Micro-ondes', /\bmicro-?ondes?\b/, 'appliances'],
  ['Cuit-vapeur', /\bcuit-?vapeur\b/, 'appliances'],
  ['Plaque de cuisson', /\bplaques? de cuisson\b/, 'appliances'],
  ['Plaque à four', /\bplaques?\b/, 'cooking'],
  ['Plat à four', /\bplats? (a four|a gratin|allant au four)\b/, 'cooking'],
  ['Plat de service', /\bplats?\b/, 'cooking'],
  ['Barbecue', /\b(barbecues?|grilles?|braises?)\b/, 'appliances'],
  ['Moule à tartelettes', /\bmoules? a tartelettes?\b/, 'cooking'],
  ['Moule à madeleines', /\bmoules? a madeleines?\b/, 'cooking'],
  ['Moule à gâteau', /\bmoules?\b/, 'cooking'],
  ['Ramequins', /\bramequins?\b/, 'cooking'],
  ['Cocotte', /\b(cocottes?|faitouts?|marmites?)\b/, 'cooking'],
  ['Sauteuse', /\bsauteuses?\b/, 'cooking'],
  ['Wok', /\bwoks?\b/, 'cooking'],
  ['Poêle', /\bpoeles?\b/, 'cooking'],
  ['Casserole', /\bcasseroles?\b/, 'cooking'],
  ['Couvercle', /\bcouvercles?\b/, 'cooking'],
  ['Four', /\bfours?\b/, 'appliances'],
  ['Saladier', /\b(saladiers?|culs? de poule)\b/, 'tools'],
  ['Essoreuse à salade', /\bessoreuses?\b/, 'tools'],
  ['Bol', /\bbols?\b/, 'tools'],
  ['Assiette', /\bassiettes?\b/, 'tools'],
  ['Tasse', /\b(tasses?|mugs?)\b/, 'tools'],
  ['Verre doseur', /\b(verres?|doseurs?)\b/, 'tools'],
  ['Balance', /\bbalances?\b/, 'appliances'],
  ['Passoire', /\bpassoires?\b/, 'tools'],
  ['Chinois', /\bchinois\b/, 'tools'],
  ['Écumoire', /\becumoires?\b/, 'tools'],
  ['Louche', /\blouches?\b/, 'tools'],
  ['Cuillère en bois', /\bcuilleres? en bois\b/, 'tools'],
  ['Cuillère', /\bcuilleres?\b/, 'tools'],
  ['Fourchette', /\bfourchettes?\b/, 'tools'],
  ['Maryse', /\bmaryses?\b/, 'tools'],
  ['Spatule', /\bspatules?\b/, 'tools'],
  ['Pinceau', /\bpinceaux?\b/, 'tools'],
  ['Économe', /\beconomes?\b/, 'tools'],
  ['Mandoline', /\bmandolines?\b/, 'tools'],
  ['Râpe', /\brapes?\b/, 'tools'],
  ['Presse-ail', /\bpresse-?ail\b/, 'tools'],
  ['Mortier', /\b(mortiers?|pilons?)\b/, 'tools'],
  ['Planche à découper', /\bplanches?\b/, 'tools'],
  ['Couteau', /\b(couteaux?|hachoirs?)\b/, 'tools'],
  ['Ciseaux', /\bciseaux\b/, 'tools'],
  ['Rouleau à pâtisserie', /\brouleaux? a patisserie\b/, 'tools'],
  ['Laminoir', /\blaminoirs?\b/, 'tools'],
  ['Plan de travail', /\bplans? de travail\b/, 'other'],
  ['Papier cuisson', /\bpapier (cuisson|sulfurise)\b/, 'other'],
  ['Papier aluminium', /\b(papier )?alu(minium)?\b/, 'other'],
  ['Film étirable', /\bfilm\b/, 'other'],
  ['Pics en bois', /\b(pics?|cure-?dents?|brochettes?)\b/, 'other'],
  ['Bocal', /\b(bocal|bocaux)\b/, 'other'],
  ['Torchon', /\btorchons?\b/, 'other'],
  ['Thermomètre', /\bthermometres?\b/, 'tools'],
  ['Minuteur', /\bminuteurs?\b/, 'tools'],
]

const FILLER = /^(\d+|un|une|deux|trois|quatre|grande?s?|petite?s?|gros|grosse?s?)\s+/

/** Nom simple d'un seul ustensile (sans « ou ») @param {string} raw */
function simpleName(raw) {
  const n = normalizeKitchen(raw)
  const known = KITCHEN_CATALOG.find(([, pattern]) => pattern.test(n))
  if (known) return known[0]
  // Inconnu : sans nombre ni « grand », au singulier
  let name = raw.trim().replace(/\s+/g, ' ')
  while (FILLER.test(normalizeKitchen(name))) name = name.replace(/^\S+\s+/, '')
  name = name.replace(/^(\S+?)s\b/, '$1')
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : null
}

// Un ustensile d'une recette → ses noms simples, un par possibilité :
// « Poêle ou grande casserole » → [Poêle, Casserole] (il suffit d'en avoir un).
// Ce qui est entre parenthèses est laissé de côté (« Ramequins (ou petits bols) » → [Ramequins]).
/** @param {string} raw @returns {string[]} */
export function kitchenNames(raw) {
  const text = raw.replace(/\([^)]*\)/g, ' ')
  const names = text.split(/\s+ou\s+/i).map(simpleName).filter(n => n !== null)
  return [...new Set(names)]
}

// Groupe d'un nom simple ; un ustensile inconnu va dans « Préparation »
/** @param {string} name @returns {KitchenGroup} */
export function kitchenGroup(name) {
  return KITCHEN_CATALOG.find(([known]) => sameKitchenName(known, name))?.[2] ?? 'tools'
}

/** @param {string} a @param {string} b */
export function sameKitchenName(a, b) {
  return normalizeKitchen(a) === normalizeKitchen(b)
}
