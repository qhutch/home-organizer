'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { isRecipeCategory } from '@/lib/recipes/categories'
import { isRecipeLabel } from '@/lib/recipes/labels'
import { isSeason } from '@/lib/recipes/seasons'
import type { Cooking, Recipe, RecipeIngredient, RecipePhoto } from '@/types/database'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { avatarUrl } from '@/lib/avatar'

async function recipesCollection() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  return { user, collection: db.collection('households').doc(membership.householdId).collection('recipes') }
}

function toRecipe(doc: FirebaseFirestore.DocumentSnapshot): Recipe {
  const d = doc.data() ?? {}
  const createdAt = d.createdAt?.toDate?.().toISOString() ?? ''
  return {
    id: doc.id,
    title: d.title as string,
    category: (d.category as string) ?? null,
    labels: (d.labels as string[]) ?? [],
    seasons: (d.seasons as string[]) ?? [],
    favorite: Boolean(d.favorite),
    rating: (d.rating as number) ?? null,
    comment: (d.comment as string) || null,
    commentBy: (d.commentBy as string) || null,
    commentAt: d.commentAt?.toDate?.().toISOString() ?? null,
    prepMinutes: (d.prepMinutes as number) ?? null,
    cookMinutes: (d.cookMinutes as number) ?? null,
    servings: (d.servings as number) ?? 2,
    ingredients: (d.ingredients as RecipeIngredient[]) ?? [],
    steps: (d.steps as string[]) ?? [],
    sourceUrl: (d.sourceUrl as string) ?? null,
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
  category: string | null
  labels: string[]
  seasons: string[]
  rating: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  servings: number
  ingredients: RecipeIngredient[]
  steps: string[]
  sourceUrl: string
}

function minutes(value: number | null) {
  return value && Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 24 * 60) : null
}

function cleanUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString().slice(0, 500) : null
  } catch {
    return null
  }
}

// photo : déjà réduite dans le navigateur (lib/recipes/photo.ts)
export async function createRecipe(input: RecipeInput, photo: Blob | null = null) {
  const title = input.title.trim().slice(0, 120)
  if (!title) return { error: 'Donne un nom à la recette.' }
  const seasons = [...new Set(input.seasons.filter(isSeason))]
  if (!seasons.length) return { error: 'Coche au moins une saison.' }

  const { user, collection } = await recipesCollection()
  const ref = await collection.add({
    title,
    category: isRecipeCategory(input.category) ? input.category : null,
    labels: [...new Set(input.labels.filter(isRecipeLabel))],
    seasons,
    favorite: false,
    rating: input.rating && input.rating >= 1 && input.rating <= 5 ? Math.round(input.rating) : null,
    prepMinutes: minutes(input.prepMinutes),
    cookMinutes: minutes(input.cookMinutes),
    servings: Math.min(Math.max(Math.round(input.servings) || 2, 1), 50),
    ingredients: input.ingredients.slice(0, 100).map(i => ({
      name: i.name.trim().slice(0, 80),
      quantity: i.quantity && Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : null,
      unit: i.unit?.trim().slice(0, 30) || null,
    })).filter(i => i.name),
    steps: input.steps.map(s => s.trim().slice(0, 2000)).filter(Boolean).slice(0, 60),
    sourceUrl: cleanUrl(input.sourceUrl),
    coverPhotoId: null,
    addedBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (photo) await savePhoto(ref, user.uid, photo)

  revalidatePath('/recipes')
  redirect(`/recipes/${ref.id}`)
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
  const commentAt = !comment ? null : unchanged ? (before.commentAt ?? null) : FieldValue.serverTimestamp()
  await doc.update({ rating, comment, commentBy, commentAt, updatedAt: FieldValue.serverTimestamp() })
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
  revalidatePath('/recipes/history')
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
