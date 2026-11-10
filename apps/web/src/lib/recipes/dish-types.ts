import type { IconName } from '@/components/ui/Icon'

// Types de plats, pour la catégorie « Plats » seulement : une rangée de filtres de plus dans la bibliothèque.
// code : le mot du code recette (import avec Claude) ; words : débuts de mots du nom qui le font deviner.
export const DISH_TYPES = [
  { id: 'pasta', label: 'Pâtes', code: 'pates', icon: 'noodles', words: ['pate', 'spaghetti', 'tagliatelle', 'penne', 'linguine', 'lasagne', 'raviol', 'gnocchi', 'fusilli', 'rigatoni', 'macaroni', 'carbonara', 'bolognaise', 'orecchiette', 'farfalle', 'conchiglie', 'pappardelle', 'coquillette', 'nouille', 'udon', 'cannelloni', 'tortellini'] },
  { id: 'soup', label: 'Soupes', code: 'soupe', icon: 'soup', words: ['soupe', 'veloute', 'potage', 'gaspacho', 'gazpacho', 'bouillon', 'minestrone', 'ramen', 'pho', 'bisque', 'garbure'] },
  { id: 'rice', label: 'Riz et risottos', code: 'riz', icon: 'bowlSpoon', words: ['riz', 'risotto', 'paella', 'biryani', 'pilaf'] },
  { id: 'salad', label: 'Salades composées', code: 'salade', icon: 'salad', words: ['salade', 'taboule', 'poke', 'bowl'] },
  { id: 'gratin', label: 'Gratins', code: 'gratin', icon: 'cheese', words: ['gratin', 'parmentier', 'moussaka', 'tartiflette'] },
  { id: 'tart', label: 'Tartes salées et quiches', code: 'tarte', icon: 'pie', words: ['tarte', 'quiche', 'tourte', 'pissaladiere', 'flamiche'] },
  { id: 'stew', label: 'Plats mijotés', code: 'mijote', icon: 'cooker', words: ['mijote', 'blanquette', 'bourguignon', 'pot-au-feu', 'daube', 'tajine', 'curry', 'chili', 'ragout', 'navarin', 'cassoulet', 'couscous', 'dahl', 'dal', 'mafe', 'carbonade', 'goulash', 'osso'] },
  { id: 'pizza', label: 'Pizzas', code: 'pizza', icon: 'pizza', words: ['pizza', 'calzone'] },
  { id: 'sandwich', label: 'Sandwichs et burgers', code: 'sandwich', icon: 'burger', words: ['sandwich', 'burger', 'croque', 'wrap', 'tacos', 'bagel', 'panini', 'kebab'] },
  { id: 'eggs', label: 'Œufs', code: 'oeufs', icon: 'eggFried', words: ['oeuf', 'omelette', 'shakshuka', 'frittata'] },
] as const satisfies readonly { id: string; label: string; code: string; icon: IconName; words: readonly string[] }[]

export type DishTypeId = (typeof DISH_TYPES)[number]['id']

// Ordre pour deviner quand le nom en cite plusieurs : « Salade de pâtes » → salade, « Gratin de pâtes » → gratin
const GUESS_ORDER: DishTypeId[] = ['soup', 'salad', 'pizza', 'tart', 'gratin', 'stew', 'sandwich', 'pasta', 'rice', 'eggs']

export function isDishType(value: unknown): value is DishTypeId {
  return DISH_TYPES.some(t => t.id === value)
}

export function dishType(id: string | null) {
  return DISH_TYPES.find(t => t.id === id) ?? null
}

function words(text: string) {
  return text.toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z-]+/).filter(Boolean)
}

// Devine le type d'un plat d'après son nom ; null = aucun ne correspond
export function guessDishType(title: string): DishTypeId | null {
  const titleWords = words(title)
  return GUESS_ORDER.find(id => {
    const type = DISH_TYPES.find(t => t.id === id)!
    return titleWords.some(w => type.words.some(start => w.startsWith(start)))
  }) ?? null
}

export function dishTypeFromCode(code: string): DishTypeId | null {
  const clean = words(code).join('-')
  return DISH_TYPES.find(t => t.code === clean || t.id === clean)?.id ?? null
}
