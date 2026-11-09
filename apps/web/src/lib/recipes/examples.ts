import type { Recipe, RecipeIngredient, RecipePhoto } from '@/types/database'
import { photoUrl } from '@/lib/recipes/photo'

// Recettes d'exemple, affichées tant que le foyer en a peu : elles montrent à quoi ressemblent
// la bibliothèque et une fiche. Elles ne sont pas en base : on peut les ouvrir, pas les modifier.

const ALL_YEAR = ['spring', 'summer', 'autumn', 'winter']
const PREFIX = 'example-'

function ing(name: string, quantity: number | null = null, unit: string | null = null): RecipeIngredient {
  return { name, quantity, unit }
}

type Example = Pick<Recipe, 'title' | 'category' | 'labels' | 'seasons' | 'favorite' | 'rating' | 'prepMinutes' | 'cookMinutes' | 'servings' | 'ingredients' | 'steps'>

const EXAMPLES: Example[] = [
  {
    title: 'Velouté de potimarron et châtaignes',
    category: 'starter', labels: ['vegetarian', 'comfort'], seasons: ['autumn', 'winter'],
    favorite: true, rating: 5, prepMinutes: 15, cookMinutes: 30, servings: 4,
    ingredients: [
      ing('potimarron', 1), ing('châtaignes cuites', 200, 'g'), ing('oignon', 1), ing('beurre', 20, 'g'),
      ing('bouillon de légumes', 75, 'cl'), ing('crème liquide', 10, 'cl'), ing('sel'), ing('poivre'),
    ],
    steps: [
      'Lave le potimarron, coupe-le en deux, retire les graines et coupe-le en cubes (pas besoin de l’éplucher).',
      'Émince l’oignon et fais-le revenir 5 minutes dans le beurre, dans une grande casserole.',
      'Ajoute le potimarron et les trois quarts des châtaignes, puis verse le bouillon.',
      'Laisse cuire 25 minutes à feu moyen, jusqu’à ce que le potimarron soit tout tendre.',
      'Mixe en ajoutant la crème, puis sale et poivre.',
      'Sers avec le reste des châtaignes émiettées par-dessus.',
    ],
  },
  {
    title: 'Tarte fine aux poireaux et chèvre',
    category: 'main', labels: ['vegetarian'], seasons: ['autumn', 'winter'],
    favorite: false, rating: 4, prepMinutes: 20, cookMinutes: 35, servings: 4,
    ingredients: [
      ing('pâte feuilletée', 1), ing('poireaux', 3), ing('bûche de chèvre', 150, 'g'), ing('œufs', 2),
      ing('crème fraîche', 20, 'cl'), ing('beurre', 20, 'g'), ing('thym'), ing('sel'), ing('poivre'),
    ],
    steps: [
      'Préchauffe le four à 200 °C.',
      'Coupe les poireaux en fines rondelles et lave-les bien.',
      'Fais fondre les poireaux 15 minutes dans le beurre à feu doux, avec une pincée de sel.',
      'Étale la pâte dans un moule et pique le fond avec une fourchette.',
      'Bats les œufs avec la crème, sale et poivre, puis mélange avec les poireaux.',
      'Verse sur la pâte, pose les rondelles de chèvre et parsème de thym.',
      'Enfourne 35 minutes, jusqu’à ce que la tarte soit dorée.',
    ],
  },
  {
    title: 'Risotto aux champignons',
    category: 'main', labels: ['vegetarian', 'comfort', 'guests'], seasons: ['autumn'],
    favorite: true, rating: 5, prepMinutes: 10, cookMinutes: 25, servings: 2,
    ingredients: [
      ing('riz arborio', 200, 'g'), ing('champignons de Paris', 250, 'g'), ing('échalote', 1),
      ing('vin blanc', 10, 'cl'), ing('bouillon de légumes', 1, 'l'), ing('parmesan', 50, 'g'),
      ing('beurre', 30, 'g'), ing('huile d’olive', 1, 'c. à s.'), ing('persil'),
    ],
    steps: [
      'Fais chauffer le bouillon dans une casserole et garde-le sur feu doux.',
      'Coupe les champignons en lamelles et fais-les dorer 5 minutes dans la moitié du beurre. Réserve-les.',
      'Émince l’échalote et fais-la revenir dans l’huile d’olive, puis ajoute le riz et remue 2 minutes jusqu’à ce qu’il devienne translucide.',
      'Verse le vin blanc et laisse-le s’évaporer en remuant.',
      'Ajoute le bouillon une louche à la fois, en remuant, et attends qu’il soit absorbé avant la suivante. Compte environ 18 minutes.',
      'Hors du feu, ajoute les champignons, le reste du beurre et le parmesan râpé. Couvre et laisse reposer 2 minutes.',
      'Sers avec un peu de persil ciselé.',
    ],
  },
  {
    title: 'Crumble pommes poires',
    category: 'dessert', labels: ['vegetarian'], seasons: ['autumn', 'winter'],
    favorite: false, rating: 4, prepMinutes: 15, cookMinutes: 35, servings: 6,
    ingredients: [
      ing('pommes', 4), ing('poires', 2), ing('farine', 100, 'g'), ing('beurre froid', 80, 'g'),
      ing('sucre roux', 80, 'g'), ing('poudre d’amandes', 50, 'g'), ing('cannelle', 1, 'c. à c.'),
    ],
    steps: [
      'Préchauffe le four à 180 °C.',
      'Épluche les pommes et les poires, coupe-les en dés et mets-les dans un plat avec la cannelle.',
      'Dans un saladier, mélange la farine, le sucre et la poudre d’amandes.',
      'Ajoute le beurre en morceaux et frotte du bout des doigts jusqu’à obtenir un sable grossier.',
      'Répartis la pâte sur les fruits sans tasser.',
      'Enfourne 35 minutes, jusqu’à ce que le dessus soit bien doré.',
    ],
  },
  {
    title: 'Curry de lentilles corail',
    category: 'main', labels: ['vegan', 'lactose-free', 'gluten-free', 'batch'], seasons: ALL_YEAR,
    favorite: true, rating: 4, prepMinutes: 10, cookMinutes: 25, servings: 4,
    ingredients: [
      ing('lentilles corail', 250, 'g'), ing('lait de coco', 40, 'cl'), ing('tomates concassées', 400, 'g'),
      ing('oignon', 1), ing('ail', 2, 'gousses'), ing('gingembre frais', 2, 'cm'), ing('curry', 2, 'c. à s.'),
      ing('huile', 1, 'c. à s.'), ing('coriandre'), ing('riz basmati', 250, 'g'),
    ],
    steps: [
      'Rince les lentilles à l’eau froide.',
      'Émince l’oignon, hache l’ail et râpe le gingembre.',
      'Fais-les revenir 5 minutes dans l’huile, puis ajoute le curry et remue 1 minute.',
      'Ajoute les lentilles, les tomates, le lait de coco et 30 cl d’eau.',
      'Laisse mijoter 20 minutes en remuant de temps en temps. Pendant ce temps, fais cuire le riz.',
      'Sale, goûte, et sers avec le riz et la coriandre.',
    ],
  },
  {
    title: 'Pancakes du dimanche',
    category: 'breakfast', labels: ['vegetarian'], seasons: ALL_YEAR,
    favorite: false, rating: 5, prepMinutes: 10, cookMinutes: 15, servings: 4,
    ingredients: [
      ing('farine', 250, 'g'), ing('lait', 30, 'cl'), ing('œufs', 2), ing('sucre', 30, 'g'),
      ing('levure chimique', 1, 'sachet'), ing('beurre fondu', 40, 'g'), ing('sel', 1, 'pincée'), ing('sirop d’érable'),
    ],
    steps: [
      'Mélange la farine, le sucre, la levure et le sel dans un saladier.',
      'Ajoute les œufs puis le lait petit à petit, en fouettant pour éviter les grumeaux.',
      'Ajoute le beurre fondu et laisse reposer 10 minutes.',
      'Fais chauffer une poêle légèrement beurrée et verse une petite louche de pâte.',
      'Retourne le pancake quand des bulles apparaissent à la surface, puis laisse cuire 1 minute de l’autre côté.',
      'Sers chaud avec du sirop d’érable.',
    ],
  },
  {
    title: 'Houmous à la betterave',
    category: 'aperitif', labels: ['vegan', 'lactose-free', 'gluten-free', 'guests'], seasons: ['autumn', 'winter'],
    favorite: false, rating: null, prepMinutes: 10, cookMinutes: null, servings: 6,
    ingredients: [
      ing('pois chiches', 400, 'g'), ing('betterave cuite', 1), ing('tahini', 2, 'c. à s.'), ing('citron', 1),
      ing('ail', 1, 'gousse'), ing('huile d’olive', 3, 'c. à s.'), ing('cumin', 1, 'c. à c.'), ing('sel'),
    ],
    steps: [
      'Égoutte et rince les pois chiches, en gardant un peu de leur eau.',
      'Coupe la betterave en morceaux et presse le citron.',
      'Mixe tous les ingrédients ensemble jusqu’à obtenir une crème lisse.',
      'Si c’est trop épais, ajoute un peu d’eau des pois chiches.',
      'Goûte, rectifie le sel et le citron, puis sers avec un filet d’huile d’olive.',
    ],
  },
  {
    title: 'Salade tomates, burrata et basilic',
    category: 'starter', labels: ['vegetarian', 'light'], seasons: ['summer'],
    favorite: true, rating: 5, prepMinutes: 10, cookMinutes: null, servings: 2,
    ingredients: [
      ing('tomates', 4), ing('burrata', 1), ing('basilic', 1, 'bouquet'), ing('huile d’olive', 3, 'c. à s.'),
      ing('vinaigre balsamique', 1, 'c. à s.'), ing('fleur de sel'), ing('poivre'),
    ],
    steps: [
      'Coupe les tomates en tranches ou en quartiers et dispose-les dans un plat.',
      'Sale avec la fleur de sel et laisse reposer 5 minutes.',
      'Pose la burrata au milieu et ouvre-la avec une cuillère.',
      'Arrose d’huile d’olive et de vinaigre balsamique, poivre et ajoute les feuilles de basilic.',
    ],
  },
  {
    title: 'Gratin de courgettes',
    category: 'main', labels: ['vegetarian', 'gluten-free'], seasons: ['summer'],
    favorite: false, rating: 3, prepMinutes: 15, cookMinutes: 40, servings: 4,
    ingredients: [
      ing('courgettes', 4), ing('crème fraîche', 20, 'cl'), ing('œufs', 2), ing('gruyère râpé', 100, 'g'),
      ing('ail', 1, 'gousse'), ing('huile d’olive', 1, 'c. à s.'), ing('sel'), ing('poivre'),
    ],
    steps: [
      'Préchauffe le four à 190 °C.',
      'Coupe les courgettes en rondelles et fais-les revenir 10 minutes dans l’huile avec l’ail haché.',
      'Bats les œufs avec la crème, sale et poivre.',
      'Mets les courgettes dans un plat à gratin, verse le mélange et couvre de gruyère.',
      'Enfourne 30 minutes, jusqu’à ce que le dessus soit gratiné.',
    ],
  },
  {
    title: 'Poulet rôti, pommes de terre au thym',
    category: 'main', labels: ['lactose-free', 'gluten-free', 'guests'], seasons: ALL_YEAR,
    favorite: true, rating: 5, prepMinutes: 15, cookMinutes: 75, servings: 4,
    ingredients: [
      ing('poulet fermier', 1), ing('pommes de terre', 1, 'kg'), ing('ail', 6, 'gousses'), ing('citron', 1),
      ing('thym', 4, 'branches'), ing('huile d’olive', 4, 'c. à s.'), ing('sel'), ing('poivre'),
    ],
    steps: [
      'Sors le poulet du réfrigérateur 30 minutes avant et préchauffe le four à 210 °C.',
      'Coupe les pommes de terre en quartiers et mets-les dans un grand plat avec l’ail en chemise, l’huile, le thym, du sel et du poivre.',
      'Glisse le citron coupé en deux dans le poulet, frotte la peau avec de l’huile et du sel.',
      'Pose le poulet sur les pommes de terre et enfourne 1 h 15.',
      'Arrose le poulet avec son jus toutes les 20 minutes et retourne les pommes de terre.',
      'Laisse reposer 10 minutes sous une feuille d’aluminium avant de découper.',
    ],
  },
  {
    title: 'Chocolat chaud épicé',
    category: 'drink', labels: ['vegetarian', 'comfort'], seasons: ['autumn', 'winter'],
    favorite: false, rating: 4, prepMinutes: 5, cookMinutes: 5, servings: 2,
    ingredients: [
      ing('lait', 50, 'cl'), ing('chocolat noir', 80, 'g'), ing('cannelle', 1, 'bâton'),
      ing('cardamome', 2, 'gousses'), ing('sucre', 1, 'c. à s.'),
    ],
    steps: [
      'Fais chauffer le lait avec la cannelle et la cardamome écrasée, sans le faire bouillir.',
      'Hors du feu, laisse infuser 5 minutes puis retire les épices.',
      'Ajoute le chocolat en morceaux et le sucre, et fouette jusqu’à ce qu’il soit fondu.',
      'Réchauffe 1 minute en fouettant pour le faire mousser, puis sers.',
    ],
  },
  {
    title: 'Clafoutis aux cerises',
    category: 'dessert', labels: ['vegetarian'], seasons: ['spring', 'summer'],
    favorite: false, rating: 4, prepMinutes: 15, cookMinutes: 40, servings: 6,
    ingredients: [
      ing('cerises', 500, 'g'), ing('œufs', 3), ing('lait', 25, 'cl'), ing('farine', 60, 'g'),
      ing('sucre', 80, 'g'), ing('beurre', 15, 'g'), ing('sucre vanillé', 1, 'sachet'),
    ],
    steps: [
      'Préchauffe le four à 180 °C et beurre un plat.',
      'Lave et équeute les cerises, puis répartis-les dans le plat (on peut garder les noyaux, ils donnent du goût).',
      'Fouette les œufs avec le sucre et le sucre vanillé, ajoute la farine puis le lait.',
      'Verse la pâte sur les cerises.',
      'Enfourne 40 minutes : le clafoutis doit être doré et pris au centre.',
      'Laisse tiédir avant de servir.',
    ],
  },
]


// Photos d'Unsplash (libres d'usage), chargées depuis leur site, dans l'ordre des exemples ;
// la première est la principale.
const PHOTOS: string[][] = [
  ['1476718406336-bb5a9690ee2a', '1757489345059-31d51e241a3e', '1603208785984-cdf985beca7a'],
  ['1767065584177-9ceb902eec7a'],
  ['1680420574628-225def8eea0a', '1633964913295-ceb43826e7c9'],
  ['1767065584306-267605a61c95'],
  ['1596797038530-2c107229654b'],
  ['1528207776546-365bb710ee93', '1757635964104-67218db55bca', '1612182062633-9ff3b3598e96'],
  ['1637949385162-e416fb15b2ce'],
  ['1769458313937-b5ad8f84942e'],
  ['1673960729830-76830e8b3db4'],
  ['1606728035253-49e8a23146de', '1762154194962-cccc677be031'],
  ['1762411245614-e0f145ba7183'],
  ['1755023178100-47fb5342a105'],
]

export const EXAMPLE_RECIPES: Recipe[] = EXAMPLES.map((e, i) => ({
  ...e,
  id: `${PREFIX}${i}`,
  comment: i === 2 ? 'Le meilleur ! Penser à garder un peu de bouillon chaud pour le servir bien crémeux.' : null,
  commentBy: null,
  commentAt: i === 2 ? '2026-11-02T19:30:00.000Z' : null,
  sourceUrl: null,
  coverPhotoId: null,
  addedBy: '',
  createdAt: '',
  updatedAt: '',
}))

export function isExampleId(id: string) {
  return id.startsWith(PREFIX)
}

export function getExampleRecipe(id: string) {
  return EXAMPLE_RECIPES.find(r => r.id === id) ?? null
}

// Photo principale d'une recette : celle d'Unsplash pour un exemple, la nôtre sinon ; null = pas de photo.
function unsplash(photo: string, width: number) {
  return `https://images.unsplash.com/photo-${photo}?w=${width}&q=75&auto=format&fit=crop`
}

export function coverUrl(recipe: Pick<Recipe, 'id' | 'coverPhotoId'>, width = 800) {
  if (isExampleId(recipe.id)) {
    const photo = PHOTOS[Number(recipe.id.slice(PREFIX.length))]?.[0]
    return photo ? unsplash(photo, width) : null
  }
  return recipe.coverPhotoId ? photoUrl(recipe.id, recipe.coverPhotoId) : null
}

// Toutes les photos d'une recette pour le carrousel de sa fiche, la principale en premier.
export function photoUrls(recipe: Pick<Recipe, 'id' | 'coverPhotoId'>, photos: RecipePhoto[], width = 1200) {
  if (isExampleId(recipe.id)) {
    return (PHOTOS[Number(recipe.id.slice(PREFIX.length))] ?? []).map(p => unsplash(p, width))
  }
  const ordered = [...photos].sort((a, b) => Number(b.id === recipe.coverPhotoId) - Number(a.id === recipe.coverPhotoId))
  return ordered.map(p => photoUrl(recipe.id, p.id))
}
