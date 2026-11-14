'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { isRecipeCategory } from '@/lib/recipes/categories'
import { guessDishType, isDishType } from '@/lib/recipes/dish-types'
import { isRecipeLabel } from '@/lib/recipes/labels'
import { isSeason } from '@/lib/recipes/seasons'
import { cleanEquipment } from '@/lib/recipes/equipment'
import { isEmojiName } from '@/lib/shopping/catalog'
import type { BatchPlan, BatchWeek, Cooking, PlannedRecipe, Recipe, RecipeIngredient, RecipePhoto, StepPhoto } from '@/types/database'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { avatarUrl } from '@/lib/avatar'
import { LinkError, readRecipeFromLink, type LinkedRecipe } from '@/lib/recipes/from-link'

async function recipesCollection() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  return { user, collection: db.collection('households').doc(membership.householdId).collection('recipes') }
}

// dishTypes (liste) ; avant, un seul dishType ; jamais choisi : deviné d'après le nom
function readDishTypes(d: FirebaseFirestore.DocumentData): string[] {
  if (d.category !== 'main') return []
  if (Array.isArray(d.dishTypes)) return d.dishTypes.filter(isDishType)
  if (d.dishType === undefined) {
    const guess = guessDishType(d.title as string)
    return guess ? [guess] : []
  }
  return isDishType(d.dishType) ? [d.dishType] : []
}

function toRecipe(doc: FirebaseFirestore.DocumentSnapshot): Recipe {
  const d = doc.data() ?? {}
  const createdAt = d.createdAt?.toDate?.().toISOString() ?? ''
  return {
    id: doc.id,
    title: d.title as string,
    category: (d.category as string) ?? null,
    categories: (d.categories as string[] | undefined) ?? (d.category ? [d.category as string] : []),
    dishTypes: readDishTypes(d),
    labels: (d.labels as string[]) ?? [],
    seasons: (d.seasons as string[]) ?? [],
    favorite: Boolean(d.favorite),
    rating: (d.rating as number) ?? null,
    comment: (d.comment as string) || null,
    commentBy: (d.commentBy as string) || null,
    commentAuthor: (d.commentAuthor as string) || null,
    commentAt: d.commentAt?.toDate?.().toISOString() ?? null,
    prepMinutes: (d.prepMinutes as number) ?? null,
    cookMinutes: (d.cookMinutes as number) ?? null,
    servings: (d.servings as number) ?? 2,
    ingredients: (d.ingredients as RecipeIngredient[]) ?? [],
    equipment: (d.equipment as string[]) ?? [],
    steps: (d.steps as string[]) ?? [],
    sourceUrl: (d.sourceUrl as string) ?? null,
    sourceBook: (d.sourceBook as string) || null,
    coverPhotoId: (d.coverPhotoId as string) ?? null,
    addedBy: d.addedBy as string,
    createdAt,
    updatedAt: d.updatedAt?.toDate?.().toISOString() ?? createdAt,
  }
}

export async function getRecipes(): Promise<Recipe[]> {
  const { collection } = await recipesCollection()
  const snapshot = await collection.orderBy('createdAt', 'desc').get()
  return snapshot.docs.map(toRecipe)
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { collection } = await recipesCollection()
  const doc = await collection.doc(id).get()
  return doc.exists ? toRecipe(doc) : null
}

export type RecipeInput = {
  title: string
  // Toutes les catégories cochées, la principale en premier
  categories: string[]
  dishTypes: string[]
  labels: string[]
  seasons: string[]
  rating: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  servings: number
  ingredients: RecipeIngredient[]
  equipment: string[]
  steps: string[]
  // Lien (Instagram, site…) ou livre de cuisine, dans le même champ
  source: string
}

function minutes(value: number | null) {
  return value && Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 24 * 60) : null
}

// Un lien va dans sourceUrl ; tout autre texte est un livre de cuisine (sourceBook)
function sourceFields(value: string) {
  const text = value.trim()
  if (!text) return { sourceUrl: null, sourceBook: null }
  const url = /^https?:\/\//i.test(text) ? cleanUrl(text) : null
  return url ? { sourceUrl: url, sourceBook: null } : { sourceUrl: null, sourceBook: text.replace(/\s+/g, ' ').slice(0, 160) }
}

function cleanUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString().slice(0, 500) : null
  } catch {
    return null
  }
}

// Champs du formulaire, nettoyés ; les étapes vides sont retirées (keptSteps : leur place d'avant, pour les photos d'étape)
function recipeFields(input: RecipeInput) {
  const title = input.title.trim().slice(0, 120)
  if (!title) return { error: 'Donne un nom à la recette.' } as const
  const seasons = [...new Set(input.seasons.filter(isSeason))]
  if (!seasons.length) return { error: 'Coche au moins une saison.' } as const
  const categories = [...new Set(input.categories.filter(isRecipeCategory))]
  const keptSteps = input.steps
    .map((text, index) => ({ text: text.trim().slice(0, 2000), index }))
    .filter(s => s.text)
    .slice(0, 60)

  return {
    keptSteps: keptSteps.map(s => s.index),
    fields: {
      title,
      category: categories[0] ?? null,
      categories,
      dishTypes: categories[0] === 'main' ? [...new Set(input.dishTypes.filter(isDishType))] : [],
      labels: [...new Set(input.labels.filter(isRecipeLabel))],
      seasons,
      rating: input.rating && input.rating >= 1 && input.rating <= 5 ? Math.round(input.rating) : null,
      prepMinutes: minutes(input.prepMinutes),
      cookMinutes: minutes(input.cookMinutes),
      servings: Math.min(Math.max(Math.round(input.servings) || 2, 1), 50),
      ingredients: input.ingredients.slice(0, 100).map(i => ({
        name: i.name.trim().slice(0, 80),
        quantity: i.quantity && Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : null,
        unit: i.unit?.trim().slice(0, 30) || null,
        emoji: isEmojiName(i.emoji) ? i.emoji : null,
      })).filter(i => i.name),
      equipment: cleanEquipment(input.equipment),
      steps: keptSteps.map(s => s.text),
      ...sourceFields(input.source),
    },
  }
}

// photo : déjà réduite dans le navigateur (lib/recipes/photo.ts)
export async function createRecipe(input: RecipeInput, photo: Blob | null = null) {
  const result = recipeFields(input)
  if ('error' in result) return { error: result.error }

  const { user, collection } = await recipesCollection()
  const ref = await collection.add({
    ...result.fields,
    favorite: false,
    coverPhotoId: null,
    addedBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (photo) await savePhoto(ref, user.uid, photo)

  revalidatePath('/recipes')
  redirect(`/recipes/${ref.id}`)
}

// stepOrigins : pour chaque étape du formulaire, sa place avant modification (null = nouvelle étape).
// Les photos d'étape suivent leur étape ; celles d'une étape supprimée sont supprimées.
export async function updateRecipe(id: string, input: RecipeInput, stepOrigins: (number | null)[]) {
  const result = recipeFields(input)
  if ('error' in result) return { error: result.error }

  const { collection } = await recipesCollection()
  const recipe = collection.doc(id)
  if (!(await recipe.get()).exists) return { error: 'Recette introuvable.' }

  // Ancienne place → nouvelle place
  const newPlace = new Map<number, number>()
  result.keptSteps.forEach((formIndex, place) => {
    const origin = stepOrigins[formIndex]
    if (typeof origin === 'number') newPlace.set(origin, place)
  })

  const photos = await recipe.collection('stepPhotos').select('step').get()
  const batch = db.batch()
  // dishType : ancien champ (un seul type), remplacé par dishTypes
  batch.update(recipe, { ...result.fields, dishType: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
  for (const photo of photos.docs) {
    const place = newPlace.get(photo.data().step as number)
    if (place === undefined) batch.delete(photo.ref)
    else if (place !== photo.data().step) batch.update(photo.ref, { step: place })
  }
  await batch.commit()

  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
  redirect(`/recipes/${id}`)
}

// Le matériel déjà noté dans les recettes du foyer, le plus utilisé d'abord : suggestions du formulaire.
export async function getEquipmentSuggestions(): Promise<string[]> {
  const { collection } = await recipesCollection()
  const snapshot = await collection.select('equipment').get()
  const counts = new Map<string, number>()
  for (const doc of snapshot.docs) {
    for (const name of cleanEquipment(doc.data().equipment)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return cleanEquipment([...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name))
}

export async function setRecipeFavorite(id: string, favorite: boolean) {
  const { collection } = await recipesCollection()
  await collection.doc(id).update({ favorite, updatedAt: FieldValue.serverTimestamp() })
  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
}

// Note (1 à 5, null = pas de note) et commentaire, depuis la fiche recette ; enregistrés tout de suite.
export async function setRecipeReview(id: string, review: { rating: number | null; comment: string }) {
  const { user, collection } = await recipesCollection()
  const rating = review.rating && review.rating >= 1 && review.rating <= 5 ? Math.round(review.rating) : null
  const comment = review.comment.trim().slice(0, 2000) || null
  const doc = collection.doc(id)
  const before = (await doc.get()).data() ?? {}
  // Le commentaire est signé par celui ou celle qui l'a modifié en dernier
  const unchanged = comment === before.comment
  const commentBy = !comment ? null : unchanged ? (before.commentBy ?? null) : user.uid
  // Un commentaire modifié n'est plus celui de l'auteur du livre
  const commentAuthor = comment && unchanged ? (before.commentAuthor ?? null) : null
  const commentAt = !comment ? null : unchanged ? (before.commentAt ?? null) : FieldValue.serverTimestamp()
  await doc.update({ rating, comment, commentBy, commentAuthor, commentAt, updatedAt: FieldValue.serverTimestamp() })
  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
}

export type MemberInfo = { name: string; avatarUrl: string | null }

// Prénom et photo des membres (Réglages), pour signer une recette ou un commentaire.
export async function getMembers(uids: (string | null)[]): Promise<Record<string, MemberInfo>> {
  await recipesCollection()
  const ids = [...new Set(uids.filter((u): u is string => !!u))]
  const docs = await Promise.all(ids.map(uid => db.collection('userProfiles').doc(uid).get()))
  return Object.fromEntries(ids.map((uid, i) => {
    const d = docs[i].data() ?? {}
    return [uid, { name: (d.displayName as string) || 'Quelqu’un du foyer', avatarUrl: avatarUrl(uid, d.avatarVersion as number | undefined) }]
  }))
}

export async function deleteRecipe(id: string) {
  const { collection } = await recipesCollection()
  // Supprime aussi ses photos
  await db.recursiveDelete(collection.doc(id))
  revalidatePath('/recipes')
  redirect('/recipes')
}

// Photos ------------------------------------------------------------------

// Firestore limite un document à 1 Mo : la photo arrive déjà réduite.
const MAX_PHOTO_BYTES = 950_000

async function savePhoto(recipe: FirebaseFirestore.DocumentReference, uid: string, photo: Blob) {
  if (photo.type !== 'image/jpeg' || photo.size > MAX_PHOTO_BYTES) return { error: 'Photo trop lourde.' }
  const ref = await recipe.collection('photos').add({
    data: Buffer.from(await photo.arrayBuffer()),
    addedBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  // La première photo devient la photo principale
  const current = (await recipe.get()).data()
  if (!current?.coverPhotoId) await recipe.update({ coverPhotoId: ref.id })
  return { id: ref.id }
}

// Les photos d'une recette, sans leur fichier (servi par /api/recipes/{id}/photos/{photoId}).
export async function getRecipePhotos(id: string): Promise<RecipePhoto[]> {
  const { collection } = await recipesCollection()
  const snapshot = await collection.doc(id).collection('photos').select('addedBy', 'createdAt').orderBy('createdAt', 'asc').get()
  return snapshot.docs.map(doc => ({
    id: doc.id,
    addedBy: doc.data().addedBy as string,
    createdAt: doc.data().createdAt?.toDate?.().toISOString() ?? '',
  }))
}

export async function addRecipePhoto(id: string, photo: Blob) {
  const { user, collection } = await recipesCollection()
  const recipe = collection.doc(id)
  if (!(await recipe.get()).exists) return { error: 'Recette introuvable.' }
  const result = await savePhoto(recipe, user.uid, photo)
  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
  return result
}

export async function setRecipeCover(id: string, photoId: string) {
  const { collection } = await recipesCollection()
  const recipe = collection.doc(id)
  if (!(await recipe.collection('photos').doc(photoId).get()).exists) return
  await recipe.update({ coverPhotoId: photoId, updatedAt: FieldValue.serverTimestamp() })
  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
}

// Remplace une photo par sa version recadrée. Elle prend un nouvel id (le navigateur garde
// l'ancienne en cache sous son adresse), mais garde sa place, son auteur et son rôle de photo principale.
export async function replaceRecipePhoto(id: string, photoId: string, photo: Blob) {
  const { collection } = await recipesCollection()
  const recipe = collection.doc(id)
  const old = await recipe.collection('photos').doc(photoId).get()
  if (!old.exists) return { error: 'Photo introuvable.' }
  if (photo.type !== 'image/jpeg' || photo.size > MAX_PHOTO_BYTES) return { error: 'Photo trop lourde.' }
  const ref = recipe.collection('photos').doc()
  const batch = db.batch()
  batch.set(ref, {
    data: Buffer.from(await photo.arrayBuffer()),
    addedBy: old.data()!.addedBy,
    createdAt: old.data()!.createdAt ?? FieldValue.serverTimestamp(),
  })
  batch.delete(old.ref)
  if ((await recipe.get()).data()?.coverPhotoId === photoId) batch.update(recipe, { coverPhotoId: ref.id })
  await batch.commit()
  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
  return { id: ref.id }
}

export async function deleteRecipePhoto(id: string, photoId: string) {
  const { collection } = await recipesCollection()
  const recipe = collection.doc(id)
  await recipe.collection('photos').doc(photoId).delete()
  // Si c'était la photo principale, la plus ancienne qui reste la remplace
  if ((await recipe.get()).data()?.coverPhotoId === photoId) {
    const next = await recipe.collection('photos').select().orderBy('createdAt', 'asc').limit(1).get()
    await recipe.update({ coverPhotoId: next.docs[0]?.id ?? null })
  }
  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
}

// Historique ---------------------------------------------------------------

// « C'est prêt » en mode cuisine : la recette entre dans l'historique du foyer.
export async function recordCooking(id: string, people: number) {
  const { user, collection } = await recipesCollection()
  const recipe = await collection.doc(id).get()
  if (!recipe.exists) return
  await collection.parent!.collection('cookings').add({
    recipeId: id,
    recipeTitle: (recipe.data()?.title as string) ?? '',
    people: Math.min(50, Math.max(1, Math.round(people) || 1)),
    cookedBy: user.uid,
    cookedAt: FieldValue.serverTimestamp(),
  })
  // Cuisinée : elle n'est plus « à cuisiner »
  await collection.parent!.collection('plannedRecipes').doc(id).delete()
  revalidatePath('/recipes/history')
  revalidatePath('/recipes')
  revalidatePath('/shopping')
}

// Les dernières recettes cuisinées, la plus récente d'abord.
export async function getCookings(limit = 60): Promise<Cooking[]> {
  const { collection } = await recipesCollection()
  const snapshot = await collection.parent!.collection('cookings').orderBy('cookedAt', 'desc').limit(limit).get()
  return snapshot.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      recipeId: d.recipeId as string,
      recipeTitle: d.recipeTitle as string,
      people: (d.people as number) ?? 1,
      cookedBy: d.cookedBy as string,
      cookedAt: d.cookedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    }
  })
}

// À cuisiner ------------------------------------------------------------------
// Les recettes dont on a envoyé les ingrédients aux courses (plannedRecipes/{recipeId}).

// Au-delà, une recette envoyée aux courses mais jamais cuisinée n'est plus montrée
const PLANNED_DAYS = 14

export async function planRecipe(id: string, people: number) {
  const { user, collection } = await recipesCollection()
  const recipe = await collection.doc(id).get()
  if (!recipe.exists) return
  await collection.parent!.collection('plannedRecipes').doc(id).set({
    recipeId: id,
    recipeTitle: (recipe.data()?.title as string) ?? '',
    people: Math.min(50, Math.max(1, Math.round(people) || 1)),
    sentBy: user.uid,
    sentAt: FieldValue.serverTimestamp(),
  })
  revalidatePath('/recipes')
  revalidatePath('/shopping')
}

export async function unplanRecipe(id: string) {
  const { collection } = await recipesCollection()
  await collection.parent!.collection('plannedRecipes').doc(id).delete()
  revalidatePath('/recipes')
  revalidatePath('/shopping')
}

// La plus récemment envoyée d'abord ; les trop anciennes sont supprimées au passage
export async function getPlannedRecipes(): Promise<PlannedRecipe[]> {
  const { collection } = await recipesCollection()
  const snapshot = await collection.parent!.collection('plannedRecipes').orderBy('sentAt', 'desc').get()
  const oldest = Date.now() - PLANNED_DAYS * 24 * 60 * 60 * 1000
  const planned: PlannedRecipe[] = []
  for (const doc of snapshot.docs) {
    const d = doc.data()
    const sentAt: Date = d.sentAt?.toDate?.() ?? new Date()
    if (sentAt.getTime() < oldest) { void doc.ref.delete(); continue }
    planned.push({
      recipeId: d.recipeId as string,
      recipeTitle: d.recipeTitle as string,
      people: (d.people as number) ?? 1,
      sentBy: d.sentBy as string,
      sentAt: sentAt.toISOString(),
    })
  }
  return planned
}

// Photos des étapes -----------------------------------------------------------
// Une par étape, à part des photos du plat (sous-collection stepPhotos) : elles n'apparaissent ni dans le carrousel
// ni comme photo principale. `step` est la place de l'étape dans recipe.steps (à partir de 0).

export async function getStepPhotos(id: string): Promise<StepPhoto[]> {
  const { collection } = await recipesCollection()
  const snapshot = await collection.doc(id).collection('stepPhotos').select('step', 'createdAt').orderBy('createdAt', 'asc').get()
  return snapshot.docs.map(doc => ({ id: doc.id, step: doc.data().step as number }))
}

export async function addStepPhoto(id: string, step: number, photo: Blob) {
  const { user, collection } = await recipesCollection()
  const recipe = await collection.doc(id).get()
  const steps = (recipe.data()?.steps as string[] | undefined) ?? []
  if (!recipe.exists || !Number.isInteger(step) || step < 0 || step >= steps.length) return { error: 'Étape introuvable.' }
  if (photo.type !== 'image/jpeg' || photo.size > MAX_PHOTO_BYTES) return { error: 'Photo trop lourde.' }
  // Une seule photo par étape : la nouvelle remplace l'ancienne
  const photos = collection.doc(id).collection('stepPhotos')
  const previous = await photos.where('step', '==', step).select().get()
  await Promise.all(previous.docs.map(doc => doc.ref.delete()))
  const ref = await photos.add({
    step,
    data: Buffer.from(await photo.arrayBuffer()),
    addedBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  revalidatePath(`/recipes/${id}`)
  return { id: ref.id }
}

export async function deleteStepPhoto(id: string, photoId: string) {
  const { collection } = await recipesCollection()
  await collection.doc(id).collection('stepPhotos').doc(photoId).delete()
  revalidatePath(`/recipes/${id}`)
}

// Batch cooking -----------------------------------------------------------------
// Une seule semaine à la fois pour le foyer (batchCooking/current), modifiée par l'un ou l'autre.

const MAX_MEALS = 14

export async function getBatchPlan(): Promise<BatchPlan> {
  const { collection } = await recipesCollection()
  const d = (await collection.parent!.collection('batchCooking').doc('current').get()).data()
  return {
    meals: (d?.meals as number) ?? 4,
    recipes: ((d?.recipes as BatchPlan['recipes'] | undefined) ?? []).filter(r => typeof r?.recipeId === 'string'),
    sentAt: d?.sentAt?.toDate?.().toISOString() ?? null,
  }
}

export async function saveBatchPlan(plan: Pick<BatchPlan, 'meals' | 'recipes'>) {
  const { user, collection } = await recipesCollection()
  const seen = new Set<string>()
  const recipes = plan.recipes
    .filter(r => typeof r.recipeId === 'string' && !seen.has(r.recipeId) && seen.add(r.recipeId))
    .slice(0, MAX_MEALS)
    .map(r => ({ recipeId: r.recipeId.slice(0, 64), people: Math.min(50, Math.max(1, Math.round(r.people) || 1)) }))
  await collection.parent!.collection('batchCooking').doc('current').set({
    meals: Math.min(MAX_MEALS, Math.max(1, Math.round(plan.meals) || 4)),
    recipes,
    updatedBy: user.uid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  revalidatePath('/recipes/batch-cooking')
}

// Courses de la semaine envoyées : la page Batch cooking passe au compte rendu de la semaine.
export async function markBatchSent() {
  const { collection } = await recipesCollection()
  await collection.parent!.collection('batchCooking').doc('current').set({ sentAt: FieldValue.serverTimestamp() }, { merge: true })
  revalidatePath('/recipes/batch-cooking')
}

// « Nouvelle semaine » : la semaine envoyée part dans l'Historique (batchWeeks), on recommence à choisir.
export async function startNewBatchWeek() {
  const { user, collection } = await recipesCollection()
  const household = collection.parent!
  const current = household.collection('batchCooking').doc('current')
  const d = (await current.get()).data()
  const recipes = (d?.recipes as BatchPlan['recipes'] | undefined) ?? []
  if (d?.sentAt && recipes.length) {
    const titles = await Promise.all(recipes.map(r => collection.doc(r.recipeId).get()))
    await household.collection('batchWeeks').add({
      recipes: recipes.map((r, i) => ({ ...r, recipeTitle: (titles[i].data()?.title as string) ?? '' })),
      sentAt: d.sentAt,
      endedAt: FieldValue.serverTimestamp(),
      endedBy: user.uid,
    })
  }
  await current.set({ recipes: [], sentAt: null, updatedBy: user.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  revalidatePath('/recipes/batch-cooking')
  revalidatePath('/recipes/history')
}

// Les semaines terminées, la plus récente d'abord.
export async function getBatchWeeks(limit = 20): Promise<BatchWeek[]> {
  const { collection } = await recipesCollection()
  const snapshot = await collection.parent!.collection('batchWeeks').orderBy('endedAt', 'desc').limit(limit).get()
  return snapshot.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      recipes: (d.recipes as BatchWeek['recipes']) ?? [],
      sentAt: d.sentAt?.toDate?.().toISOString() ?? '',
      endedAt: d.endedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    }
  })
}

// Recette depuis un lien : on lit la fiche recette de la page, pour pré-remplir le formulaire.
export async function readRecipeLink(link: string): Promise<{ ok: true; recipe: LinkedRecipe['recipe']; photo: LinkedRecipe['photo'] } | { ok: false; error: string }> {
  await recipesCollection()
  try {
    const { recipe, photo } = await readRecipeFromLink(link)
    return { ok: true, recipe, photo }
  } catch (error) {
    return { ok: false, error: error instanceof LinkError ? error.message : 'Impossible de lire cette recette.' }
  }
}
