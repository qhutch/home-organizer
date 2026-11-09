import type { Recipe, RecipeIngredient } from '@/types/database'

// Recettes d'exemple, affichées tant que le foyer n'en a enregistré aucune :
// elles montrent à quoi ressemble la bibliothèque. Elles ne sont pas en base.

const ALL_YEAR = ['spring', 'summer', 'autumn', 'winter']

function ing(name: string, quantity: number | null = null, unit: string | null = null): RecipeIngredient {
  return { name, quantity, unit }
}

type Example = Pick<Recipe, 'title' | 'category' | 'labels' | 'seasons' | 'favorite' | 'rating' | 'prepMinutes' | 'cookMinutes' | 'servings' | 'ingredients'>

const EXAMPLES: Example[] = [
  {
    title: 'Velouté de potimarron et châtaignes',
    category: 'starter', labels: ['vegetarian', 'comfort'], seasons: ['autumn', 'winter'],
    favorite: true, rating: 5, prepMinutes: 15, cookMinutes: 30, servings: 4,
    ingredients: [ing('potimarron', 1), ing('châtaignes', 200, 'g'), ing('oignon', 1), ing('crème', 10, 'cl')],
  },
  {
    title: 'Tarte fine aux poireaux et chèvre',
    category: 'main', labels: ['vegetarian'], seasons: ['autumn', 'winter'],
    favorite: false, rating: 4, prepMinutes: 20, cookMinutes: 35, servings: 4,
    ingredients: [ing('pâte feuilletée', 1), ing('poireaux', 3), ing('chèvre', 150, 'g'), ing('œufs', 2)],
  },
  {
    title: 'Risotto aux champignons',
    category: 'main', labels: ['vegetarian', 'comfort', 'guests'], seasons: ['autumn'],
    favorite: true, rating: 5, prepMinutes: 10, cookMinutes: 25, servings: 2,
    ingredients: [ing('riz arborio', 200, 'g'), ing('champignons', 250, 'g'), ing('parmesan', 50, 'g'), ing('bouillon', 1, 'l')],
  },
  {
    title: 'Crumble pommes poires',
    category: 'dessert', labels: ['vegetarian'], seasons: ['autumn', 'winter'],
    favorite: false, rating: 4, prepMinutes: 15, cookMinutes: 35, servings: 6,
    ingredients: [ing('pommes', 4), ing('poires', 2), ing('farine', 100, 'g'), ing('beurre', 80, 'g')],
  },
  {
    title: 'Curry de lentilles corail',
    category: 'main', labels: ['vegan', 'lactose-free', 'gluten-free', 'batch'], seasons: ALL_YEAR,
    favorite: true, rating: 4, prepMinutes: 10, cookMinutes: 25, servings: 4,
    ingredients: [ing('lentilles corail', 250, 'g'), ing('lait de coco', 40, 'cl'), ing('oignon', 1), ing('curry', 2, 'c. à s.')],
  },
  {
    title: 'Pancakes du dimanche',
    category: 'breakfast', labels: ['vegetarian'], seasons: ALL_YEAR,
    favorite: false, rating: 5, prepMinutes: 10, cookMinutes: 15, servings: 4,
    ingredients: [ing('farine', 250, 'g'), ing('lait', 30, 'cl'), ing('œufs', 2), ing('sucre', 30, 'g')],
  },
  {
    title: 'Houmous à la betterave',
    category: 'aperitif', labels: ['vegan', 'lactose-free', 'gluten-free', 'guests'], seasons: ['autumn', 'winter'],
    favorite: false, rating: null, prepMinutes: 10, cookMinutes: null, servings: 6,
    ingredients: [ing('pois chiches', 400, 'g'), ing('betterave cuite', 1), ing('tahini', 2, 'c. à s.'), ing('citron', 1)],
  },
  {
    title: 'Salade tomates, burrata et basilic',
    category: 'starter', labels: ['vegetarian', 'light'], seasons: ['summer'],
    favorite: true, rating: 5, prepMinutes: 10, cookMinutes: null, servings: 2,
    ingredients: [ing('tomates', 4), ing('burrata', 1), ing('basilic'), ing('huile d’olive')],
  },
  {
    title: 'Gratin de courgettes',
    category: 'main', labels: ['vegetarian', 'gluten-free'], seasons: ['summer'],
    favorite: false, rating: 3, prepMinutes: 15, cookMinutes: 40, servings: 4,
    ingredients: [ing('courgettes', 4), ing('crème', 20, 'cl'), ing('gruyère', 100, 'g')],
  },
  {
    title: 'Poulet rôti, pommes de terre au thym',
    category: 'main', labels: ['lactose-free', 'gluten-free', 'guests'], seasons: ALL_YEAR,
    favorite: true, rating: 5, prepMinutes: 15, cookMinutes: 75, servings: 4,
    ingredients: [ing('poulet', 1), ing('pommes de terre', 1, 'kg'), ing('thym'), ing('ail', 4, 'gousses')],
  },
  {
    title: 'Chocolat chaud épicé',
    category: 'drink', labels: ['vegetarian', 'comfort'], seasons: ['autumn', 'winter'],
    favorite: false, rating: 4, prepMinutes: 5, cookMinutes: 5, servings: 2,
    ingredients: [ing('lait', 50, 'cl'), ing('chocolat noir', 80, 'g'), ing('cannelle')],
  },
  {
    title: 'Clafoutis aux cerises',
    category: 'dessert', labels: ['vegetarian'], seasons: ['spring', 'summer'],
    favorite: false, rating: 4, prepMinutes: 15, cookMinutes: 40, servings: 6,
    ingredients: [ing('cerises', 500, 'g'), ing('œufs', 3), ing('lait', 25, 'cl'), ing('farine', 60, 'g')],
  },
]

export const EXAMPLE_RECIPES: Recipe[] = EXAMPLES.map((e, i) => ({
  ...e,
  id: `example-${i}`,
  steps: [],
  sourceUrl: null,
  coverPhotoId: null,
  addedBy: '',
  createdAt: '',
  updatedAt: '',
}))
