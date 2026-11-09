import { isRecipeCategory, type RecipeCategoryId } from '@/lib/recipes/categories'
import { parseIngredientLine } from '@/lib/recipes/ingredients'
import { RECIPE_LABELS, type RecipeLabelId } from '@/lib/recipes/labels'
import { SEASONS, type SeasonId } from '@/lib/recipes/seasons'
import type { RecipeIngredient } from '@/types/database'

// « Code recette » : la recette rangée en JSON par Claude (dans le chat) à partir d'une photo,
// d'un lien ou d'un texte, puis collée dans Hestia. Ce n'est que du texte : rien ne s'exécute.

const CATEGORY_WORDS: Record<string, RecipeCategoryId> = {
  entree: 'starter', plat: 'main', dessert: 'dessert', apero: 'aperitif', 'petit-dej': 'breakfast', boisson: 'drink',
}

// La consigne à donner à Claude (bouton « Copier la consigne »).
export const IMPORT_PROMPT = `Tu m'aides à ranger des recettes dans mon appli Hestia.
Je vais t'envoyer une recette : une photo, une capture d'écran, un lien ou un texte.

Remplis TOUS les champs ci-dessous, même quand la recette ne les donne pas : déduis-les à partir des ingrédients et des étapes (catégorie, étiquettes, saisons, durées, nombre de personnes). Si tu as un vrai doute sur une information importante, pose-moi d'abord tes questions (courtes, une par ligne), puis donne le code une fois que j'ai répondu.

Quand tout est clair, réponds uniquement avec un bloc de code JSON, sans rien d'autre, au format suivant :

{
  "hestia": "recette",
  "titre": "Velouté de potimarron",
  "categorie": "plat",
  "etiquettes": ["vegetarien", "reconfortant"],
  "saisons": ["automne", "hiver"],
  "personnes": 4,
  "preparation": 15,
  "cuisson": 30,
  "ingredients": [
    { "nom": "potimarron", "quantite": 1, "unite": null },
    { "nom": "crème liquide", "quantite": 20, "unite": "cl" }
  ],
  "etapes": [
    "Couper le potimarron en cubes, sans l'éplucher.",
    "Faire revenir l'oignon émincé 5 minutes dans l'huile.",
    "Ajouter le potimarron, couvrir d'eau et cuire 30 minutes.",
    "Mixer avec la crème, saler et poivrer."
  ],
  "source": "https://lien-de-la-recette"
}

Règles :
- "categorie" : une seule valeur parmi entree, plat, dessert, apero, petit-dej, boisson.
- "etiquettes" : toutes celles qui s'appliquent parmi vegetarien, vegan, sans-lactose, sans-gluten, leger, reconfortant, pour-recevoir, batch-cooking. Vérifie chaque ingrédient (ex. : beurre, crème ou fromage → pas sans-lactose ; farine de blé, pâtes → pas sans-gluten ; viande ou poisson → pas vegetarien). Liste vide si aucune.
- "saisons" : au moins une parmi printemps, ete, automne, hiver, d'après les produits de saison en France (plusieurs possibles). Si la recette se fait toute l'année, mets les quatre.
- "preparation" et "cuisson" : en minutes (nombres). Estime-les si la recette ne les donne pas.
- "personnes" : le nombre de personnes de la recette d'origine ; garde les quantités pour ce nombre. Estime-le s'il manque.
- "unite" : courte et en français (g, kg, cl, l, c. à soupe, c. à café, pincée, gousse…), ou null.
- "etapes" : chaque étape sera affichée seule, en grand, dans un mode cuisine. Découpe la recette en étapes courtes (une ou deux actions chacune), dans l'ordre, sans numéro au début. Garde les durées et les températures dans le texte (« cuire 30 minutes à 180 °C »).
- "source" : le lien que je t'ai donné, sinon null.
- N'invente pas d'ingrédients : seules les informations ci-dessus peuvent être déduites.
- Si tu ne peux pas ouvrir un lien (Instagram, TikTok…), dis-le et demande-moi une capture d'écran ou le texte de la légende.`

export type ImportedRecipe = {
  title: string
  category: RecipeCategoryId | null
  labels: RecipeLabelId[]
  seasons: SeasonId[]
  servings: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  ingredients: RecipeIngredient[]
  steps: string[]
  sourceUrl: string | null
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function positive(value: unknown) {
  const n = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')
}

function ingredient(value: unknown): RecipeIngredient | null {
  if (typeof value === 'string') return parseIngredientLine(value)
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const name = text(v.nom ?? v.name)
  if (!name) return null
  return { name, quantity: positive(v.quantite ?? v.quantity), unit: text(v.unite ?? v.unit) || null }
}

// Lit un code recette collé (avec ou sans les ``` autour). null = pas un code recette.
export function parseImportCode(input: string): ImportedRecipe | null {
  const start = input.indexOf('{')
  const end = input.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  let data: unknown
  try {
    data = JSON.parse(input.slice(start, end + 1))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const d = data as Record<string, unknown>

  const title = text(d.titre ?? d.title)
  if (!title) return null

  const categoryWord = normalize(text(d.categorie ?? d.category))
  const category = CATEGORY_WORDS[categoryWord] ?? (isRecipeCategory(categoryWord) ? categoryWord : null)
  const list = (value: unknown) => (Array.isArray(value) ? value : [])

  const codes = (value: unknown) => list(value).map(v => normalize(text(v)))
  const labels = codes(d.etiquettes ?? d.labels)
  const seasonCodes = codes(d.saisons ?? d.seasons)
  const allYear = seasonCodes.some(c => c.startsWith('toute'))

  return {
    title,
    category,
    labels: RECIPE_LABELS.filter(l => labels.includes(l.code) || labels.includes(l.id)).map(l => l.id),
    seasons: SEASONS.filter(s => allYear || seasonCodes.includes(s.code) || seasonCodes.includes(s.id)).map(s => s.id),
    servings: positive(d.personnes ?? d.servings),
    prepMinutes: positive(d.preparation ?? d.prepMinutes),
    cookMinutes: positive(d.cuisson ?? d.cookMinutes),
    ingredients: list(d.ingredients).map(ingredient).filter(i => i !== null),
    steps: list(d.etapes ?? d.steps).map(text).filter(Boolean),
    sourceUrl: text(d.source ?? d.sourceUrl) || null,
  }
}
