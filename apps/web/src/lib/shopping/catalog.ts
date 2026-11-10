import type { IconName } from '@/components/ui/Icon'
import { EMOJI_FR } from './emoji-words'

// Catalogue des articles courants : emoji (Fluent, dans public/emoji) et rayon du magasin.
// Sert à illustrer les tuiles, proposer des suggestions et ranger la liste par rayon.

export type Aisle = {
  id: string
  label: string
  icon: IconName // titre du rayon
  emoji: string // article inconnu de ce rayon
}

// Ordre d'un parcours classique en supermarché.
export const AISLES: Aisle[] = [
  { id: 'fruits-legumes', label: 'Fruits et légumes', icon: 'carrot', emoji: 'leafy_green' },
  { id: 'boulangerie', label: 'Boulangerie', icon: 'bread', emoji: 'bread' },
  { id: 'cremerie', label: 'Crèmerie', icon: 'cheese', emoji: 'cheese_wedge' },
  { id: 'viandes-poissons', label: 'Viandes et poissons', icon: 'meat', emoji: 'cut_of_meat' },
  { id: 'epicerie-salee', label: 'Épicerie salée', icon: 'salt', emoji: 'canned_food' },
  { id: 'epicerie-sucree', label: 'Épicerie sucrée', icon: 'cookie', emoji: 'cookie' },
  { id: 'surgeles', label: 'Surgelés', icon: 'frozen', emoji: 'ice' },
  { id: 'boissons', label: 'Boissons', icon: 'bottle', emoji: 'cup_with_straw' },
  { id: 'hygiene', label: 'Hygiène et beauté', icon: 'bath', emoji: 'lotion_bottle' },
  { id: 'entretien', label: 'Entretien', icon: 'spray', emoji: 'sponge' },
  { id: 'bricolage', label: 'Bricolage', icon: 'tool', emoji: 'hammer_and_wrench' },
  { id: 'autres', label: 'Autres', icon: 'bag', emoji: 'shopping_bags' },
]

export const DEFAULT_AISLE = 'autres'

export function isAisleId(id: string | null | undefined): id is string {
  return !!id && AISLES.some(a => a.id === id)
}

export function getAisle(id: string | null | undefined): Aisle {
  return AISLES.find(a => a.id === id) ?? AISLES[AISLES.length - 1]
}

type CatalogEntry = { name: string; emoji: string; aisle: string }

// [nom, emoji, rayon] — l'emoji est le nom d'un fichier de public/emoji
const RAW: [string, string, string][] = [
  // Fruits et légumes
  ['Pommes', 'red_apple', 'fruits-legumes'],
  ['Poires', 'pear', 'fruits-legumes'],
  ['Bananes', 'banana', 'fruits-legumes'],
  ['Oranges', 'tangerine', 'fruits-legumes'],
  ['Citrons', 'lemon', 'fruits-legumes'],
  ['Clémentines', 'tangerine', 'fruits-legumes'],
  ['Raisin', 'grapes', 'fruits-legumes'],
  ['Fraises', 'strawberry', 'fruits-legumes'],
  ['Framboises', 'strawberry', 'fruits-legumes'],
  ['Myrtilles', 'blueberries', 'fruits-legumes'],
  ['Cerises', 'cherries', 'fruits-legumes'],
  ['Pêches', 'peach', 'fruits-legumes'],
  ['Abricots', 'peach', 'fruits-legumes'],
  ['Melon', 'melon', 'fruits-legumes'],
  ['Pastèque', 'watermelon', 'fruits-legumes'],
  ['Ananas', 'pineapple', 'fruits-legumes'],
  ['Mangue', 'mango', 'fruits-legumes'],
  ['Kiwis', 'kiwi_fruit', 'fruits-legumes'],
  ['Avocats', 'avocado', 'fruits-legumes'],
  ['Tomates', 'tomato', 'fruits-legumes'],
  ['Tomates cerises', 'tomato', 'fruits-legumes'],
  ['Concombre', 'cucumber', 'fruits-legumes'],
  ['Courgettes', 'cucumber', 'fruits-legumes'],
  ['Potimarron', 'jack-o-lantern', 'fruits-legumes'],
  ['Asperges', 'leafy_green', 'fruits-legumes'],
  ['Roquette', 'green_salad', 'fruits-legumes'],
  ['Courge', 'jack-o-lantern', 'fruits-legumes'],
  ['Butternut', 'jack-o-lantern', 'fruits-legumes'],
  ['Potiron', 'jack-o-lantern', 'fruits-legumes'],
  ['Betteraves', 'roasted_sweet_potato', 'fruits-legumes'],
  ['Aubergines', 'eggplant', 'fruits-legumes'],
  ['Poivrons', 'bell_pepper', 'fruits-legumes'],
  ['Carottes', 'carrot', 'fruits-legumes'],
  ['Pommes de terre', 'potato', 'fruits-legumes'],
  ['Patates douces', 'roasted_sweet_potato', 'fruits-legumes'],
  ['Oignons', 'onion', 'fruits-legumes'],
  ['Échalotes', 'onion', 'fruits-legumes'],
  ['Ail', 'garlic', 'fruits-legumes'],
  ['Salade', 'green_salad', 'fruits-legumes'],
  ['Épinards', 'leafy_green', 'fruits-legumes'],
  ['Chou', 'leafy_green', 'fruits-legumes'],
  ['Brocoli', 'broccoli', 'fruits-legumes'],
  ['Chou-fleur', 'broccoli', 'fruits-legumes'],
  ['Champignons', 'mushroom', 'fruits-legumes'],
  ['Haricots verts', 'pea_pod', 'fruits-legumes'],
  ['Petits pois', 'pea_pod', 'fruits-legumes'],
  ['Maïs', 'ear_of_corn', 'fruits-legumes'],
  ['Poireaux', 'leafy_green', 'fruits-legumes'],
  ['Radis', 'carrot', 'fruits-legumes'],
  ['Gingembre', 'ginger_root', 'fruits-legumes'],
  ['Herbes fraîches', 'herb', 'fruits-legumes'],
  ['Basilic', 'herb', 'fruits-legumes'],
  ['Persil', 'herb', 'fruits-legumes'],
  ['Ciboulette', 'herb', 'fruits-legumes'],
  ['Estragon', 'herb', 'fruits-legumes'],
  ['Thym', 'herb', 'fruits-legumes'],
  ['Menthe', 'herb', 'fruits-legumes'],
  ['Céleri', 'leafy_green', 'fruits-legumes'],
  ['Coriandre', 'herb', 'fruits-legumes'],
  ['Piment', 'hot_pepper', 'fruits-legumes'],

  // Boulangerie
  ['Pain', 'bread', 'boulangerie'],
  ['Baguette', 'baguette_bread', 'boulangerie'],
  ['Pain de mie', 'bread', 'boulangerie'],
  ['Croissants', 'croissant', 'boulangerie'],
  ['Brioche', 'bread', 'boulangerie'],
  ['Pains burger', 'hamburger', 'boulangerie'],
  ['Tortillas', 'flatbread', 'boulangerie'],

  // Crèmerie
  ['Lait', 'glass_of_milk', 'cremerie'],
  ['Lait d’avoine', 'glass_of_milk', 'cremerie'],
  ['Beurre', 'butter', 'cremerie'],
  ['Œufs', 'egg', 'cremerie'],
  ['Yaourts', 'bowl_with_spoon', 'cremerie'],
  ['Fromage', 'cheese_wedge', 'cremerie'],
  ['Fromage râpé', 'cheese_wedge', 'cremerie'],
  ['Mozzarella', 'cheese_wedge', 'cremerie'],
  ['Parmesan', 'cheese_wedge', 'cremerie'],
  ['Parmigiano', 'cheese_wedge', 'cremerie'],
  ['Pecorino', 'cheese_wedge', 'cremerie'],
  ['Grana padano', 'cheese_wedge', 'cremerie'],
  ['Gorgonzola', 'cheese_wedge', 'cremerie'],
  ['Ricotta', 'cheese_wedge', 'cremerie'],
  ['Mascarpone', 'cheese_wedge', 'cremerie'],
  ['Burrata', 'cheese_wedge', 'cremerie'],
  ['Fontina', 'cheese_wedge', 'cremerie'],
  ['Emmental', 'cheese_wedge', 'cremerie'],
  ['Cheddar', 'cheese_wedge', 'cremerie'],
  ['Mont d’or', 'cheese_wedge', 'cremerie'],
  ['Ravioles', 'dumpling', 'cremerie'],
  ['Gnocchis', 'dumpling', 'cremerie'],
  ['Pâte filo', 'pie', 'cremerie'],
  ['Feta', 'cheese_wedge', 'cremerie'],
  ['Comté', 'cheese_wedge', 'cremerie'],
  ['Chèvre', 'cheese_wedge', 'cremerie'],
  ['Crème fraîche', 'jar', 'cremerie'],
  ['Crème liquide', 'glass_of_milk', 'cremerie'],
  ['Fromage blanc', 'bowl_with_spoon', 'cremerie'],
  ['Pâte feuilletée', 'pie', 'cremerie'],
  ['Pâte brisée', 'pie', 'cremerie'],

  // Viandes et poissons
  ['Poulet', 'poultry_leg', 'viandes-poissons'],
  ['Steak haché', 'hamburger', 'viandes-poissons'],
  ['Bœuf', 'cut_of_meat', 'viandes-poissons'],
  ['Porc', 'cut_of_meat', 'viandes-poissons'],
  ['Veau', 'cut_of_meat', 'viandes-poissons'],
  ['Jambon', 'cut_of_meat', 'viandes-poissons'],
  ['Lardons', 'bacon', 'viandes-poissons'],
  ['Pancetta', 'bacon', 'viandes-poissons'],
  ['Guanciale', 'bacon', 'viandes-poissons'],
  ['Saucisses', 'hot_dog', 'viandes-poissons'],
  ['Saumon', 'fish', 'viandes-poissons'],
  ['Poisson', 'fish', 'viandes-poissons'],
  ['Thon', 'canned_food', 'viandes-poissons'],
  ['Crevettes', 'shrimp', 'viandes-poissons'],
  ['Tofu', 'falafel', 'viandes-poissons'],

  // Épicerie salée
  ['Pâtes', 'spaghetti', 'epicerie-salee'],
  ['Macaronis', 'spaghetti', 'epicerie-salee'],
  ['Polenta', 'ear_of_corn', 'epicerie-salee'],
  ['Cube de bouillon', 'pot_of_food', 'epicerie-salee'],
  ['Sauce au yaourt', 'bowl_with_spoon', 'epicerie-salee'],
  ['Dukkah', 'chestnut', 'epicerie-salee'],
  ['Chapelure', 'bread', 'epicerie-salee'],
  ['Riz', 'cooked_rice', 'epicerie-salee'],
  ['Semoule', 'bowl_with_spoon', 'epicerie-salee'],
  ['Quinoa', 'bowl_with_spoon', 'epicerie-salee'],
  ['Lentilles', 'beans', 'epicerie-salee'],
  ['Pois chiches', 'beans', 'epicerie-salee'],
  ['Haricots rouges', 'beans', 'epicerie-salee'],
  ['Huile d’olive', 'olive', 'epicerie-salee'],
  ['Huile', 'droplet', 'epicerie-salee'],
  ['Vinaigre', 'droplet', 'epicerie-salee'],
  ['Sel', 'salt', 'epicerie-salee'],
  ['Poivre', 'salt', 'epicerie-salee'],
  ['Épices', 'hot_pepper', 'epicerie-salee'],
  ['Curry', 'hot_pepper', 'epicerie-salee'],
  ['Cumin', 'hot_pepper', 'epicerie-salee'],
  ['Garam masala', 'hot_pepper', 'epicerie-salee'],
  ['Paprika', 'hot_pepper', 'epicerie-salee'],
  ['Cardamome', 'hot_pepper', 'epicerie-salee'],
  ['Fleur de sel', 'salt', 'epicerie-salee'],
  ['Gros sel', 'salt', 'epicerie-salee'],
  ['Miso', 'jar', 'epicerie-salee'],
  ['Tahini', 'jar', 'epicerie-salee'],
  ['Vinaigrette', 'jar', 'epicerie-salee'],
  ['Aquafaba', 'droplet', 'epicerie-salee'],
  ['Graines', 'seedling', 'epicerie-salee'],
  ['Moutarde', 'jar', 'epicerie-salee'],
  ['Mayonnaise', 'jar', 'epicerie-salee'],
  ['Ketchup', 'tomato', 'epicerie-salee'],
  ['Sauce tomate', 'tomato', 'epicerie-salee'],
  ['Pesto', 'herb', 'epicerie-salee'],
  ['Coulis de tomate', 'tomato', 'epicerie-salee'],
  ['Sauce soja', 'droplet', 'epicerie-salee'],
  ['Conserves', 'canned_food', 'epicerie-salee'],
  ['Bouillon', 'pot_of_food', 'epicerie-salee'],
  ['Olives', 'olive', 'epicerie-salee'],
  ['Chips', 'potato', 'epicerie-salee'],
  ['Biscuits apéritif', 'pretzel', 'epicerie-salee'],
  ['Lait de coco', 'coconut', 'epicerie-salee'],

  // Épicerie sucrée
  ['Farine', 'sheaf_of_rice', 'epicerie-sucree'],
  ['Sucre', 'candy', 'epicerie-sucree'],
  ['Levure', 'bread', 'epicerie-sucree'],
  ['Chocolat', 'chocolate_bar', 'epicerie-sucree'],
  ['Pépites de chocolat', 'chocolate_bar', 'epicerie-sucree'],
  ['Biscuits', 'cookie', 'epicerie-sucree'],
  ['Céréales', 'bowl_with_spoon', 'epicerie-sucree'],
  ['Granola', 'bowl_with_spoon', 'epicerie-sucree'],
  ['Fleur d’oranger', 'droplet', 'epicerie-sucree'],
  ['Noisettes', 'chestnut', 'epicerie-sucree'],
  ['Vanille', 'herb', 'epicerie-sucree'],
  ['Sirop d’érable', 'honey_pot', 'epicerie-sucree'],
  ['Flocons d’avoine', 'bowl_with_spoon', 'epicerie-sucree'],
  ['Confiture', 'jar', 'epicerie-sucree'],
  ['Miel', 'honey_pot', 'epicerie-sucree'],
  ['Pâte à tartiner', 'jar', 'epicerie-sucree'],
  ['Café', 'hot_beverage', 'epicerie-sucree'],
  ['Thé', 'teacup_without_handle', 'epicerie-sucree'],
  ['Compote', 'green_apple', 'epicerie-sucree'],
  ['Amandes', 'chestnut', 'epicerie-sucree'],
  ['Noix', 'chestnut', 'epicerie-sucree'],
  ['Pignons de pin', 'evergreen_tree', 'epicerie-sucree'],
  ['Cacahuètes', 'peanuts', 'epicerie-sucree'],

  // Surgelés
  ['Glace', 'ice_cream', 'surgeles'],
  ['Pizza surgelée', 'pizza', 'surgeles'],
  ['Légumes surgelés', 'ice', 'surgeles'],
  ['Frites surgelées', 'french_fries', 'surgeles'],
  ['Poisson pané', 'fish', 'surgeles'],

  // Boissons
  ['Eau', 'potable_water', 'boissons'],
  ['Eau gazeuse', 'bubbles', 'boissons'],
  ['Jus d’orange', 'tangerine', 'boissons'],
  ['Jus de fruits', 'beverage_box', 'boissons'],
  ['Sirop', 'tropical_drink', 'boissons'],
  ['Soda', 'cup_with_straw', 'boissons'],
  ['Bière', 'beer_mug', 'boissons'],
  ['Vin', 'wine_glass', 'boissons'],
  ['Vin rouge', 'wine_glass', 'boissons'],
  ['Vin blanc', 'wine_glass', 'boissons'],
  ['Champagne', 'bottle_with_popping_cork', 'boissons'],

  // Hygiène et beauté
  ['Papier toilette', 'roll_of_paper', 'hygiene'],
  ['Mouchoirs', 'roll_of_paper', 'hygiene'],
  ['Dentifrice', 'toothbrush', 'hygiene'],
  ['Brosse à dents', 'toothbrush', 'hygiene'],
  ['Shampoing', 'lotion_bottle', 'hygiene'],
  ['Gel douche', 'lotion_bottle', 'hygiene'],
  ['Savon', 'soap', 'hygiene'],
  ['Déodorant', 'lotion_bottle', 'hygiene'],
  ['Coton', 'cloud', 'hygiene'],
  ['Crème solaire', 'sun', 'hygiene'],
  ['Rasoirs', 'razor', 'hygiene'],

  // Entretien
  ['Liquide vaisselle', 'bubbles', 'entretien'],
  ['Pastilles lave-vaisselle', 'bubbles', 'entretien'],
  ['Lessive', 'basket', 'entretien'],
  ['Adoucissant', 'basket', 'entretien'],
  ['Éponges', 'sponge', 'entretien'],
  ['Sacs poubelle', 'wastebasket', 'entretien'],
  ['Essuie-tout', 'roll_of_paper', 'entretien'],
  ['Papier aluminium', 'package', 'entretien'],
  ['Film alimentaire', 'package', 'entretien'],
  ['Nettoyant multi-usage', 'bucket', 'entretien'],
  ['Vinaigre blanc', 'bucket', 'entretien'],
  ['Javel', 'test_tube', 'entretien'],

  // Bricolage
  ['Ampoules', 'light_bulb', 'bricolage'],
  ['Piles', 'battery', 'bricolage'],
  ['Vis', 'nut_and_bolt', 'bricolage'],
  ['Chevilles', 'nut_and_bolt', 'bricolage'],
  ['Peinture', 'paintbrush', 'bricolage'],
  ['Scotch', 'package', 'bricolage'],
  ['Colle', 'hammer_and_wrench', 'bricolage'],
  ['Clous', 'hammer', 'bricolage'],
  ['Écrous', 'nut_and_bolt', 'bricolage'],
  ['Crochets', 'hook', 'bricolage'],
  ['Pinceaux', 'paintbrush', 'bricolage'],
  ['Rouleau de peinture', 'paintbrush', 'bricolage'],
  ['Ruban de masquage', 'package', 'bricolage'],
  ['Enduit', 'brick', 'bricolage'],
  ['Mastic', 'brick', 'bricolage'],
  ['Silicone', 'brick', 'bricolage'],
  ['Joint', 'brick', 'bricolage'],
  ['Ciment', 'brick', 'bricolage'],
  ['Papier de verre', 'carpentry_saw', 'bricolage'],
  ['Planches', 'wood', 'bricolage'],
  ['Tasseaux', 'wood', 'bricolage'],
  ['Scie', 'carpentry_saw', 'bricolage'],
  ['Marteau', 'hammer', 'bricolage'],
  ['Tournevis', 'screwdriver', 'bricolage'],
  ['Clé', 'wrench', 'bricolage'],
  ['Mètre', 'straight_ruler', 'bricolage'],
  ['Gants', 'gloves', 'bricolage'],
  ['Échelle', 'ladder', 'bricolage'],
  ['Lampe torche', 'flashlight', 'bricolage'],
  ['Rallonge', 'electric_plug', 'bricolage'],
  ['Multiprise', 'electric_plug', 'bricolage'],
  ['Prise', 'electric_plug', 'bricolage'],
  ['Câble', 'electric_plug', 'bricolage'],
  ['Interrupteur', 'electric_plug', 'bricolage'],
  ['Boîte à outils', 'toolbox', 'bricolage'],
  ['Terreau', 'potted_plant', 'bricolage'],
  ['Plantes', 'potted_plant', 'bricolage'],
]

const CATALOG: CatalogEntry[] = RAW.map(([name, emoji, aisle]) => ({ name, emoji, aisle }))

// « Œufs » → « oeufs », « Pêches » → « peches »
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[’']/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Forme sans pluriel simple, pour que « tomate » trouve « Tomates ».
function singular(word: string): string {
  if (word.length > 3 && (word.endsWith('s') || word.endsWith('x'))) return word.slice(0, -1)
  return word
}

function key(text: string): string {
  return normalize(text).split(' ').map(singular).join(' ')
}

// Clé d'un nom d'article : « Tomates » et « tomate » ont la même.
export function itemKey(name: string): string {
  return key(name)
}

const BY_KEY = new Map(CATALOG.map(entry => [key(entry.name), entry]))

// Retrouve l'entrée du catalogue d'un article tapé librement :
// « Tomates » ou « tomate » → Tomates ; « Lait demi-écrémé » → Lait.
export function findCatalogEntry(name: string): CatalogEntry | null {
  const k = key(name)
  if (!k) return null
  const exact = BY_KEY.get(k)
  if (exact) return exact
  // Le plus long nom du catalogue qui commence l'article tapé.
  let best: CatalogEntry | null = null
  let bestLength = 0
  for (const [entryKey, entry] of BY_KEY) {
    if ((k.startsWith(entryKey + ' ') || k.startsWith(entryKey + '-')) && entryKey.length > bestLength) {
      best = entry
      bestLength = entryKey.length
    }
  }
  return best
}

// Tous les emojis disponibles : d'abord ceux du catalogue (dans l'ordre des rayons), puis le reste
// de la nourriture, des boissons et de la cuisine. C'est ce qu'on peut choisir dans la fiche d'un article.
export const EMOJIS: string[] = [...new Set([
  ...CATALOG.map(e => e.emoji),
  ...AISLES.map(a => a.emoji),
  ...EMOJI_FR.map(([emoji]) => emoji),
])]

const EMOJI_UNICODE_WORDS = new Map(EMOJI_FR)

// Mots en plus des noms d'articles, pour retrouver un emoji en le cherchant.
const EMOJI_WORDS: Record<string, string> = {
  red_apple: 'pomme fruit rouge', green_apple: 'pomme verte compote', pear: 'poire', banana: 'banane',
  tangerine: 'orange mandarine agrume jus', lemon: 'citron agrume jaune', grapes: 'raisin', strawberry: 'fraise confiture',
  blueberries: 'myrtille baies', cherries: 'cerise', peach: 'peche abricot nectarine', melon: 'melon',
  watermelon: 'pasteque', pineapple: 'ananas', mango: 'mangue', kiwi_fruit: 'kiwi', avocado: 'avocat guacamole',
  tomato: 'tomate sauce ketchup', cucumber: 'concombre courgette cornichon', eggplant: 'aubergine', bell_pepper: 'poivron',
  carrot: 'carotte legume', potato: 'pomme de terre patate chips', roasted_sweet_potato: 'patate douce',
  onion: 'oignon echalote', garlic: 'ail', green_salad: 'salade', leafy_green: 'salade chou epinard poireau legume vert',
  broccoli: 'brocoli chou-fleur', mushroom: 'champignon', pea_pod: 'petit pois haricot vert', ear_of_corn: 'mais',
  ginger_root: 'gingembre', herb: 'herbes basilic persil menthe aromatique', hot_pepper: 'piment epice',
  bread: 'pain', baguette_bread: 'baguette pain', croissant: 'croissant viennoiserie', flatbread: 'tortilla wrap galette',
  hamburger: 'burger steak hache', glass_of_milk: 'lait creme', butter: 'beurre', egg: 'oeuf',
  cheese_wedge: 'fromage parmesan pecorino', evergreen_tree: 'pignon pin sapin', 'jack-o-lantern': 'potimarron courge potiron citrouille butternut', seedling: 'graines lin courge chia tournesol', jar: 'pot bocal confiture moutarde mayonnaise sauce', bowl_with_spoon: 'yaourt cereales bol',
  pie: 'pate tarte', poultry_leg: 'poulet volaille', cut_of_meat: 'viande boeuf porc jambon', bacon: 'lardons bacon',
  hot_dog: 'saucisse saucisson chipolata merguez charcuterie', fish: 'poisson saumon', canned_food: 'conserve boite thon', shrimp: 'crevette fruits de mer',
  falafel: 'tofu falafel', spaghetti: 'pates spaghetti', cooked_rice: 'riz', beans: 'haricots lentilles pois chiches',
  olive: 'olive huile', droplet: 'huile vinaigre goutte liquide', salt: 'sel poivre', pot_of_food: 'bouillon soupe plat',
  pretzel: 'aperitif biscuit sale', coconut: 'noix de coco', sheaf_of_rice: 'farine ble cereale',
  candy: 'bonbon sucre friandise', chocolate_bar: 'chocolat', cookie: 'biscuit gateau', honey_pot: 'miel',
  hot_beverage: 'cafe chocolat chaud', teacup_without_handle: 'the tisane', chestnut: 'noix amande chataigne',
  peanuts: 'cacahuete', ice_cream: 'glace dessert', pizza: 'pizza', ice: 'surgele glacon', french_fries: 'frites',
  potable_water: 'eau', bubbles: 'eau gazeuse bulles vaisselle', beverage_box: 'jus brique', tropical_drink: 'sirop cocktail',
  cup_with_straw: 'soda boisson', beer_mug: 'biere', wine_glass: 'vin', bottle_with_popping_cork: 'champagne',
  roll_of_paper: 'papier toilette essuie-tout mouchoir', toothbrush: 'dentifrice brosse a dents', lotion_bottle: 'gel douche shampoing creme',
  soap: 'savon', cloud: 'coton', sun: 'creme solaire', razor: 'rasoir', basket: 'lessive linge panier', sponge: 'eponge',
  wastebasket: 'poubelle sac', package: 'colis carton aluminium film scotch', bucket: 'seau menage nettoyant',
  test_tube: 'javel produit', light_bulb: 'ampoule lumiere', battery: 'pile batterie', nut_and_bolt: 'vis ecrou boulon cheville',
  paintbrush: 'peinture pinceau', hammer_and_wrench: 'outils colle', hammer: 'marteau clou', screwdriver: 'tournevis',
  electric_plug: 'prise rallonge cable electricite', gloves: 'gants', straight_ruler: 'metre regle', wrench: 'cle',
  toolbox: 'boite a outils', brick: 'mastic ciment enduit joint brique', ladder: 'echelle', hook: 'crochet',
  carpentry_saw: 'scie bois', potted_plant: 'plante terreau jardin', wood: 'bois planche', flashlight: 'lampe torche',
  shopping_bags: 'sac courses divers',
  doughnut: 'donut beignet', oyster: 'huitre fruits de mer', lobster: 'homard langouste fruits de mer',
  crab: 'crabe surimi fruits de mer', squid: 'calamar encornet seiche poulpe',
  birthday_cake: 'gateau anniversaire', shortcake: 'gateau patisserie fraisier', custard: 'creme dessert flan',
  cooking: 'cuisine cuisson poele four plaque', fire: 'four cuisson gaz plaque chaud', spoon: 'cuisine cuillere ustensile',
  fork_and_knife: 'cuisine couverts ustensile', chopsticks: 'cuisine baguettes ustensile', teapot: 'cuisine bouilloire',
  timer_clock: 'cuisine minuteur', thermometer: 'cuisine four temperature', shallow_pan_of_food: 'cuisine plat four gratin',
  hourglass_done: 'cuisine minuteur sablier', baby_bottle: 'biberon bebe lait infantile', takeout_box: 'traiteur plat a emporter',
}

const EMOJI_SEARCH = new Map(EMOJIS.map(emoji => [
  emoji,
  normalize([
    EMOJI_WORDS[emoji] ?? '',
    EMOJI_UNICODE_WORDS.get(emoji) ?? '',
    ...CATALOG.filter(e => e.emoji === emoji).map(e => e.name),
    ...AISLES.filter(a => a.emoji === emoji).map(a => a.label),
  ].join(' ')),
]))

// Emojis qui correspondent à ce qui est tapé, les plus proches d'abord :
// 1. un de leurs noms est exactement le mot (« fromage » → 🧀 avant 🥣 « fromage blanc »),
// 2. un de leurs mots-clés est ce mot, 3. un mot-clé commence par ce qui est tapé (« fro »).
export function searchEmojis(query: string): string[] {
  const q = normalize(query)
  if (!q) return EMOJIS
  const k = key(q)
  const ranks: [string[], string[], string[]] = [[], [], []]
  for (const emoji of EMOJIS) {
    const text = EMOJI_SEARCH.get(emoji) ?? ''
    const names = [...CATALOG.filter(e => e.emoji === emoji).map(e => e.name), ...(EMOJI_UNICODE_WORDS.has(emoji) ? [EMOJI_UNICODE_WORDS.get(emoji)!.split(' ')[0]] : [])]
    if (names.some(name => key(name) === k)) ranks[0].push(emoji)
    else if (q.includes(' ') ? text.includes(q) : EMOJI_TOKENS.get(emoji)?.has(singular(q))) ranks[1].push(emoji)
    else if (!q.includes(' ') && text.split(/[ -]/).some(word => word.startsWith(q))) ranks[2].push(emoji)
  }
  return ranks.flat()
}

export function isEmojiName(name: string | null | undefined): name is string {
  return !!name && EMOJIS.includes(name)
}

// L'emoji choisi à la main s'il y en a un, sinon celui de l'article s'il est connu,
// sinon celui de son rayon.
export function emojiFor(name: string, aisleId?: string | null, chosen?: string | null): string {
  if (isEmojiName(chosen)) return chosen
  return findCatalogEntry(name)?.emoji ?? guessEmoji(name) ?? getAisle(aisleId).emoji
}

// Mots qui ne disent rien du produit : « Sauce pour pâtes bio » → sauce, pâtes.
const STOP_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'au', 'aux', 'a', 'en', 'et', 'pour', 'avec', 'sans', 'bio', 'gros', 'petit', 'petite', 'grand', 'grande', 'paquet', 'boite', 'sachet', 'pack', 'bouteille', 'pot', 'tranche', 'rouge', 'vert', 'verte', 'blanc', 'blanche', 'jaune'])

// Mots-clés de chaque emoji, au singulier, pour la recherche du plus proche.
const EMOJI_TOKENS = new Map(EMOJIS.map(emoji => [
  emoji,
  new Set((EMOJI_SEARCH.get(emoji) ?? '').split(/[ -]/).filter(Boolean).map(singular)),
]))

// Pour un article absent du catalogue, l'emoji dont les mots-clés ressemblent le plus à son nom
// (« Kombucha gingembre » → gingembre, « Fruit de la passion » → fruit). Le premier mot compte
// le plus : en français, c'est souvent lui qui dit ce qu'est le produit. null si rien ne ressemble.
export function guessEmoji(name: string): string | null {
  const words = normalize(name).split(/[ -]/).map(singular).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  let best: string | null = null
  let bestScore = 0
  for (const emoji of EMOJIS) {
    const tokens = EMOJI_TOKENS.get(emoji)!
    let score = 0
    words.forEach((word, i) => {
      const weight = i === 0 ? 2 : 1
      if (tokens.has(word)) score += 3 * weight
      else if (word.length >= 4 && [...tokens].some(token => token.length >= 4 && (token.startsWith(word) || word.startsWith(token)))) score += weight
    })
    // À égalité, le premier dans EMOJIS l'emporte : ceux du catalogue passent avant les autres.
    if (score > bestScore) {
      best = emoji
      bestScore = score
    }
  }
  return best
}

// Le rayon d'un article : celui du catalogue, sinon celui de l'article du catalogue dont le nom
// lui ressemble le plus (« Jus de pomme » → Jus d'orange → Boissons ; le premier mot compte double),
// sinon celui des articles qui ont le même emoji (« Tisane » → 🍵 comme Thé → Épicerie sucrée).
export function aisleFor(name: string): string {
  const entry = findCatalogEntry(name)
  if (entry) return entry.aisle
  const words = normalize(name).split(/[ -]/).map(singular).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  let best: CatalogEntry | null = null
  let bestScore = 0
  for (const candidate of CATALOG) {
    const tokens = normalize(candidate.name).split(/[ -]/).map(singular)
    let score = 0
    words.forEach((word, i) => {
      if (tokens.includes(word)) score += i === 0 ? 2 : 1
    })
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  if (best) return best.aisle
  const guess = guessEmoji(name)
  return (guess && CATALOG.find(e => e.emoji === guess)?.aisle) || DEFAULT_AISLE
}

// Articles du catalogue dont un mot commence par ce qui est tapé.
export function searchCatalog(query: string, limit = 8): CatalogEntry[] {
  const q = normalize(query)
  if (!q) return []
  const starts: CatalogEntry[] = []
  const contains: CatalogEntry[] = []
  for (const entry of CATALOG) {
    const n = normalize(entry.name)
    if (n.startsWith(q)) starts.push(entry)
    else if (n.split(/[ -]/).some(word => word.startsWith(q))) contains.push(entry)
  }
  return [...starts, ...contains].slice(0, limit)
}

export function sameItemName(a: string, b: string): boolean {
  return key(a) === key(b)
}
