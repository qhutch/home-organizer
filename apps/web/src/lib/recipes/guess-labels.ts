import type { RecipeLabelId } from '@/lib/recipes/labels'
import type { RecipeIngredient } from '@/types/database'

// Étiquettes devinées pour une recette lue depuis un lien : d'après ses ingrédients
// (végétarien, végan, sans lactose, sans gluten), son nom (réconfortant) et ses étapes (barbecue).
// Léger, pour recevoir et en van restent à cocher : trop subjectifs pour être devinés.

function normalize(text: string) {
  return text.toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '\' ')
}

const MEAT_FISH = new RegExp('\\b(' + [
  'boeuf', 'veau', 'porc', 'poulet', 'poulets', 'volaille', 'dinde', 'canard', 'agneau', 'mouton', 'lapin', 'gibier', 'chevreuil', 'sanglier', 'pintade', 'caille',
  'viandes?', 'steaks?', 'escalopes?', 'magrets?', 'cuisses?', 'blancs? de poulet', 'filet mignon', 'roti', 'jarret', 'paleron', 'bavette', 'entrecote', 'cotes? de porc', 'cotelettes?',
  'lardons?', 'jambon', 'bacon', 'chorizo', 'saucisses?', 'saucisson', 'merguez', 'chipolatas?', 'pancetta', 'prosciutto', 'coppa', 'bresaola', 'speck', 'guanciale', 'andouillette', 'boudin', 'foie gras', 'rillettes', 'pate en croute',
  'poissons?', 'saumon', 'thon', 'cabillaud', 'colin', 'merlu', 'lieu', 'sardines?', 'maquereaux?', 'truites?', 'dorades?', 'loup', 'sole', 'haddock', 'anchois', 'eglefin', 'lotte', 'raie', 'bar',
  'crevettes?', 'gambas', 'moules', 'saint-jacques', 'noix de saint-jacques', 'calamars?', 'encornets?', 'poulpe', 'seiche', 'crabe', 'homard', 'langoustines?', 'huitres?', 'palourdes', 'coques', 'surimi', 'oeufs de lompe', 'tarama',
  'gelatine', 'nuoc-mam', 'nuoc mam', 'sauce poisson', 'fond de veau', 'bouillon de (boeuf|volaille|poulet|veau)', 'cube de (boeuf|volaille)',
].join('|') + ')\\b')

// Laits, crèmes et beurres végétaux : pas des produits laitiers
const PLANT = /\b(coco|soja|avoine|amandes?|riz|vegetale?s?|noisettes?|cajou|cacahuetes?|epeautre|karite|cacao)\b/

const DAIRY = new RegExp('\\b(' + [
  'lait', 'laits', 'beurre', 'creme', 'cremes', 'fromages?', 'yaourts?', 'yogourt', 'skyr', 'faisselle', 'petits?-suisses?', 'chantilly', 'bechamel',
  'mascarpone', 'ricotta', 'mozzarella', 'burrata', 'parmesan', 'parmigiano', 'pecorino', 'grana padano', 'feta', 'comte', 'emmental', 'gruyere', 'beaufort', 'chevre', 'bleu', 'roquefort', 'gorgonzola',
  'cheddar', 'gouda', 'raclette', 'reblochon', 'camembert', 'brie', 'mont d\' or', 'boursin', 'crottins?', 'cabecou', 'fontina', 'tomme', 'morbier', 'fourme', 'saint-nectaire', 'munster', 'maroilles', 'halloumi', 'cancoillotte', 'kiri', 'saint-moret', 'philadelphia',
  'pate feuilletee', 'pate brisee', 'pate sablee', 'brioche', 'ghee',
].join('|') + ')\\b')

const OTHER_ANIMAL = /\b(oeufs?|jaunes? d' oeufs?|blancs? d' oeufs?|miel)\b/

const GLUTEN = new RegExp('\\b(' + [
  'farine', 'pates?(?! (d\' |de |a tartiner))', 'spaghettis?', 'tagliatelles?', 'penne', 'fusilli', 'lasagnes?', 'macaronis?', 'coquillettes', 'linguine', 'rigatoni', 'farfalle', 'orecchiette', 'pappardelle', 'tortellini', 'cannelloni',
  'ravioli', 'ravioles', 'gnocchis?', 'nouilles', 'udon', 'semoule', 'couscous', 'boulgour', 'ble', 'epeautre', 'seigle', 'orge', 'avoine',
  'pain', 'pains', 'baguette', 'chapelure', 'croutons?', 'brioche', 'biscuits?', 'biscottes?', 'speculoos', 'boudoirs?', 'genoise', 'crepes?', 'galettes? de ble', 'tortillas?', 'wraps?', 'bieres?', 'sauce soja', 'seitan',
].join('|') + ')\\b')

// Farines et nouilles sans gluten
const GLUTEN_FREE = /\b(riz|mais|sarrasin|pois chiches?|chataigne|coco|amandes?|lentilles|manioc|tapioca|quinoa|sans gluten|de konjac)\b/

const COMFORT = /\b(gratin|gratine|parmentier|tartiflette|raclette|fondue|croziflette|lasagnes?|hachis|puree|blanquette|bourguignon|pot-au-feu|daube|cassoulet|choucroute|carbonade|mijote|ragout|navarin|potee|garbure|soupe|veloute|potage|risotto|mac and cheese|crumble|chocolat chaud|moelleux|fondant|brioche perdue|pain perdu|crepes?|gaufres?|chili|curry|dahl|dal|tajine|goulash|osso)\b/

export function guessLabels(title: string, ingredients: RecipeIngredient[], steps: string[]): RecipeLabelId[] {
  const names = ingredients.map(i => normalize(i.name))
  if (!names.length) return []

  const hasMeat = names.some(n => MEAT_FISH.test(n))
  const hasDairy = names.some(n => !PLANT.test(n) && DAIRY.test(n))
  const hasOtherAnimal = names.some(n => OTHER_ANIMAL.test(n))
  const hasGluten = names.some(n => GLUTEN.test(n) && !GLUTEN_FREE.test(n))

  const labels: RecipeLabelId[] = []
  if (!hasMeat) labels.push('vegetarian')
  if (!hasMeat && !hasDairy && !hasOtherAnimal) labels.push('vegan')
  if (!hasDairy) labels.push('lactose-free')
  if (!hasGluten) labels.push('gluten-free')
  if (COMFORT.test(normalize(title))) labels.push('comfort')
  if (/\b(barbecue|bbq|braises)\b/.test(normalize(`${title} ${steps.join(' ')}`))) labels.push('bbq')
  return labels
}
