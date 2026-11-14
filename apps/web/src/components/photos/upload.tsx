'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { uploadAlbumPhoto } from '@/app/(app)/photos/actions'
import { FEATURES } from '@/lib/ui/features'

// Une photo passe telle quelle sous cette taille ; au-dessus, on la réencode en JPEG (et la réduit si besoin)
const PHOTO_MAX = 3_800_000

// Réduit une photo trop lourde pour l'envoi, sans différence visible : JPEG 90 %, puis plus petite si nécessaire
async function fitForUpload(file: File): Promise<File> {
  if (file.size <= PHOTO_MAX && file.type === 'image/jpeg') return file
  const bitmap = await createImageBitmap(file)
  let scale = 1
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (blob && blob.size <= PHOTO_MAX) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified })
    }
    scale *= 0.8
  }
  throw new Error('trop lourde')
}

// Envoie les photos une à une dans un album créé par Hestia ; rend les erreurs (une par photo ratée)
export async function sendPhotos(album: string, files: File[], onProgress: (done: number) => void): Promise<string[]> {
  const failed: string[] = []
  for (const [i, original] of files.entries()) {
    try {
      const file = await fitForUpload(original)
      const form = new FormData()
      form.append('album', album)
      form.append('file', file)
      form.append('mtime', String(Math.floor(original.lastModified / 1000)))
      const result = await uploadAlbumPhoto(form)
      if (!result.ok) failed.push(result.error)
    } catch {
      failed.push(`${original.name} : impossible à lire`)
    }
    onProgress(i + 1)
  }
  return failed
}

// Ouvre la photothèque. « waiting » s'affiche pendant que l'iPhone prépare les photos choisies
// (avec beaucoup de photos, ça peut prendre un moment avant qu'on les reçoive).
export function pickPhotos(onWaiting: (waiting: boolean) => void, onPicked: (files: File[]) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.addEventListener('change', () => {
    onWaiting(false)
    const files = Array.from(input.files ?? [])
    if (files.length) onPicked(files)
  })
  input.addEventListener('cancel', () => onWaiting(false))
  onWaiting(true)
  input.click()
}

export type UploadState =
  | { step: 'waiting' }
  | { step: 'sending'; done: number; total: number }
  | { step: 'done'; total: number; errors: string[] }

// Écran plein d'envoi, par-dessus tout : on voit où on en est, et on ne peut pas repartir sans le vouloir
export function UploadScreen({ state, onClose }: { state: UploadState; onClose: () => void }) {
  // Prévenir avant de quitter la page pendant l'envoi
  useEffect(() => {
    if (state.step !== 'sending') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [state.step])

  const percent = state.step === 'sending' ? Math.round((state.done / state.total) * 100) : state.step === 'done' ? 100 : 0
  return createPortal(
    <div className="fixed inset-0 z-50 bg-page flex flex-col items-center justify-center gap-5 px-8 text-center" role="dialog" aria-modal="true" aria-live="polite">
      {state.step === 'waiting' && (
        <>
          <p className="font-display font-semibold text-2xl">Choix des photos…</p>
          <button type="button" className="btn-outline" onClick={onClose}>Annuler</button>
        </>
      )}
      {state.step === 'sending' && (
        <>
          <p className="font-display font-semibold text-2xl">Envoi des photos</p>
          <p className="big-number text-prune-deep">{state.done} / {state.total}</p>
          <div className="w-full max-w-xs h-2 rounded-full bg-prune-soft overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-prune transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-sm text-ink-muted">Garde Hestia ouverte jusqu’à la fin</p>
        </>
      )}
      {state.step === 'done' && (
        <>
          <p className="font-display font-semibold text-2xl">
            {state.errors.length === 0 ? 'C’est dans l’album !' : `${state.total - state.errors.length} / ${state.total} photos envoyées`}
          </p>
          {state.errors.length > 0 && (
            <ul className="text-sm text-pink-deep max-h-40 overflow-y-auto">
              {state.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <button type="button" className={`btn-feature ${FEATURES.photos.fill}`} onClick={onClose}>Voir l’album</button>
        </>
      )}
    </div>,
    document.body,
  )
}
