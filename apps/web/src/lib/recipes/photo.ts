// Réduit une photo dans le navigateur avant l'envoi : 1600 px au plus, en JPEG,
// pour qu'elle tienne dans un document Firestore (moins de 900 Ko).
const MAX_SIDE = 1600
const MAX_BYTES = 900_000

export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
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
