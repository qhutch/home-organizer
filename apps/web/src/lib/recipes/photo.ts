import type { Recipe, RecipePhoto } from '@/types/database'

// Réduit une photo dans le navigateur avant l'envoi : 1600 px au plus (maxSide), en JPEG,
// pour qu'elle tienne dans un document Firestore (moins de 900 Ko).
const MAX_SIDE = 1600
const MAX_BYTES = 900_000

export async function shrinkPhoto(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  let quality = 0.82
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_BYTES) return blob
    scale *= 0.8
    quality = Math.max(0.6, quality - 0.08)
  }
  throw new Error('Photo trop lourde')
}

export function photoUrl(recipeId: string, photoId: string) {
  return `/api/recipes/${recipeId}/photos/${photoId}`
}

export function stepPhotoUrl(recipeId: string, photoId: string) {
  return `/api/recipes/${recipeId}/step-photos/${photoId}`
}

// Photo principale d'une recette (bibliothèque, historique) ; null = pas de photo.
export function coverUrl(recipe: Pick<Recipe, 'id' | 'coverPhotoId'>) {
  return recipe.coverPhotoId ? photoUrl(recipe.id, recipe.coverPhotoId) : null
}

// Toutes les photos d'une recette pour le carrousel de sa fiche, la principale en premier.
export function photoIds(recipe: Pick<Recipe, 'id' | 'coverPhotoId'>, photos: RecipePhoto[]) {
  const ordered = [...photos].sort((a, b) => Number(b.id === recipe.coverPhotoId) - Number(a.id === recipe.coverPhotoId))
  return ordered.map(p => p.id)
}

// Format des photos à l'écran (carrousel, cartes) : le recadrage suit le même
export const PHOTO_RATIO = 4 / 3

// Découpe une partie d'une photo déjà affichée (rect en pixels de l'image d'origine),
// en JPEG de 1600 px de large au plus, sous la même limite de poids que shrinkPhoto.
export async function cropPhoto(image: HTMLImageElement, rect: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  let scale = Math.min(1, MAX_SIDE / rect.width)
  let quality = 0.85
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(rect.width * scale)
    canvas.height = Math.round(rect.height * scale)
    canvas.getContext('2d')?.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_BYTES) return blob
    scale *= 0.8
    quality = Math.max(0.6, quality - 0.08)
  }
  throw new Error('Photo trop lourde')
}
