export type ShoppingItem = {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  notes: string | null
  // Rayon du magasin (id de AISLES dans lib/shopping/catalog.ts)
  category: string | null
  // Emoji choisi à la main (nom d'un fichier de public/emoji) ; null = celui du catalogue
  emoji: string | null
  inList: boolean
  addedBy: string
  createdAt: string
  // Dernier ajout, achat ou modification : sert à trier les récents
  updatedAt: string
}

export type Household = {
  id: string
  name: string
  createdAt: string
}

export type HouseholdMember = {
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
}

export type Profile = {
  id: string
  displayName: string | null
  avatarUrl: string | null
  updatedAt: string
}

export type RecipeIngredient = {
  name: string
  quantity: number | null
  unit: string | null
  // Emoji choisi à la main (nom d'un fichier de public/emoji) ; absent ou null = celui du catalogue
  emoji?: string | null
}

export type Recipe = {
  id: string
  title: string
  // Catégorie principale (id de RECIPE_CATEGORIES dans lib/recipes/categories.ts) : icône, type de plat
  category: string | null
  // Toutes ses catégories, la principale en premier (petit-déj et dessert…) ; la bibliothèque la montre dans chacune
  categories: string[]
  // Types de plat (ids de DISH_TYPES dans lib/recipes/dish-types.ts), pour les plats seulement ; plusieurs possibles
  // (pâtes et plat mijoté). Jamais choisis : devinés d'après le nom à la lecture
  dishTypes: string[]
  // Labels (ids de RECIPE_LABELS dans lib/recipes/labels.ts) : végétarien, sans lactose…
  labels: string[]
  // Saisons cochées (ids de SEASONS dans lib/recipes/seasons.ts) ; les quatre = toute l'année
  seasons: string[]
  favorite: boolean
  // Note de 1 à 5 ; null = pas encore notée
  rating: number | null
  // Notre avis après l'avoir cuisinée (texte libre) ; null = pas de commentaire
  comment: string | null
  // Qui a écrit le commentaire (uid) ; null = pas de commentaire
  commentBy: string | null
  // Commentaire signé par quelqu'un hors du foyer (l'auteur du livre d'origine) ; prime sur commentBy
  commentAuthor: string | null
  // Date du commentaire (ISO) ; null = pas de commentaire
  commentAt: string | null
  // Minutes ; null = inconnu
  prepMinutes: number | null
  cookMinutes: number | null
  servings: number
  ingredients: RecipeIngredient[]
  // Matériel (casserole, mortier…), dans l'ordre ; l'emoji est deviné d'après le nom (lib/recipes/equipment.ts)
  equipment: string[]
  steps: string[]
  // Lien vers la recette d'origine (Instagram, site…)
  sourceUrl: string | null
  // Livre de cuisine d'origine (« Le Bon Goût de la Flemme, Mégane Ardérighi ») ; null = pas un livre
  sourceBook: string | null
  // Photo principale (id dans la sous-collection photos) ; null = pas de photo
  coverPhotoId: string | null
  addedBy: string
  createdAt: string
  updatedAt: string
}

// Photo d'une recette : le fichier est servi par /api/recipes/{id}/photos/{photoId}
export type RecipePhoto = {
  id: string
  addedBy: string
  createdAt: string
}

// Une fois où l'on a cuisiné une recette (mode cuisine, « C'est prêt »), pour l'historique
export type Cooking = {
  id: string
  recipeId: string
  // Nom de la recette au moment où on l'a cuisinée (reste lisible si la recette est supprimée)
  recipeTitle: string
  people: number
  cookedBy: string
  cookedAt: string
}

// Recette à cuisiner : ses ingrédients ont été envoyés aux courses (un doc par recette, le dernier envoi).
// Elle sort de la liste avec « C'est prêt », à la main (×) ou au bout de PLANNED_DAYS jours.
export type PlannedRecipe = {
  recipeId: string
  // Nom au moment de l'envoi (pour la liste de courses, sans relire la recette)
  recipeTitle: string
  people: number
  sentBy: string
  sentAt: string
}

// Photo d'une étape (mode cuisine), à part des photos du plat : servie par /api/recipes/{id}/step-photos/{photoId}
export type StepPhoto = {
  id: string
  // Numéro de l'étape, à partir de 0 (place dans recipe.steps)
  step: number
}

// Une case à cocher d'un travail : une étape, ou du matériel à acheter
export type WorkCheck = {
  text: string
  done: boolean
}

export type WorkStatus = 'todo' | 'doing' | 'done'

// Un travail de la maison : une simple tâche (« Changer l'ampoule du couloir ») ou un projet
// avec ses étapes, son matériel et son budget. Une fois terminé, il reste dans l'historique.
export type Work = {
  id: string
  title: string
  status: WorkStatus
  // Pièce ou endroit (« Salle de bain », « Jardin ») ; null = pas précisé
  room: string | null
  // Qui s'en occupe (uids) ; vide = personne pour l'instant
  assignees: string[]
  steps: WorkCheck[]
  // Matériel à acheter, envoyé aux courses d'un bouton
  supplies: WorkCheck[]
  // Budget prévu, en euros ; null = pas de budget
  budget: number | null
  notes: string | null
  // Artisan qui intervient (id dans households/{hid}/artisans) ; null = on le fait nous-mêmes
  artisanId: string | null
  // Jour d'intervention de l'artisan (AAAA-MM-JJ) ; null = pas encore fixé
  interventionDate: string | null
  // Montant du devis reçu, en euros ; null = pas de devis
  quote: number | null
  // Date où il est passé à « Terminé » (ISO) ; null = pas terminé
  doneAt: string | null
  addedBy: string
  createdAt: string
  updatedAt: string
}

// Document du foyer (onglet Documents) : households/{hid}/documents/{id}.
// Le fichier lui-même est rangé à part, en morceaux chiffrés (lib/documents/storage.ts).
export type PaperKind = 'quote' | 'invoice'

export type HouseholdDocument = {
  id: string
  name: string
  mimeType: string
  size: number
  // Dossier qui le contient ; null = à la racine (« Documents »)
  folderId: string | null
  addedBy: string
  createdAt: string
  // Dernière ouverture dans Hestia (pour « Récents »)
  lastOpenedAt: string | null
  // Aperçu (miniature) rangé avec le fichier
  hasThumb: boolean
  // Date d'expiration (passeport, assurance…), « AAAA-MM-JJ »
  expiresOn: string | null
  // Mis à la corbeille ce jour-là ; null = rangé normalement
  trashedAt: string | null
  // Devis ou facture des Travaux (null = document ordinaire) : ceux-là s'ouvrent sans Face ID
  paperKind: PaperKind | null
  // Travail et artisan auxquels il est relié (devis et factures seulement)
  workId: string | null
  artisanId: string | null
  // Adresse de sa page dans Hestia et nom de son dossier (« Maison › Assurances »)
  href: string
  place: string
}

// Dossier de documents : households/{hid}/documentFolders/{id}. parentId null = à la racine.
export type DocumentFolder = {
  id: string
  name: string
  parentId: string | null
}

// Un artisan du foyer (plombier, électricien…), qu'on relie aux travaux où il intervient
export type Artisan = {
  id: string
  name: string
  // Métier (« Plombier ») ; null = pas précisé
  trade: string | null
  phone: string | null
  email: string | null
  notes: string | null
  addedBy: string
  createdAt: string
}

// Devis ou facture vu depuis Travaux (sans Face ID) : un document de households/{hid}/documents marqué paperKind
export type WorkPaper = {
  id: string
  name: string
  kind: PaperKind
  mimeType: string
  size: number
  hasThumb: boolean
  workId: string | null
  artisanId: string | null
  addedBy: string
  createdAt: string
}
