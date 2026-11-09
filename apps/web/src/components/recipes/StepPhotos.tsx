'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import { addStepPhoto, deleteStepPhoto } from '@/app/(app)/recipes/actions'
import { shrinkPhoto, stepPhotoUrl } from '@/lib/recipes/photo'
import type { StepPhoto } from '@/types/database'

// Photos d'une étape, dans le mode cuisine : une rangée qu'on fait glisser, et une case pour en ajouter.
// Elles restent à part des photos du plat (voir getStepPhotos). On touche une photo pour la voir en grand
// ou la supprimer. `readOnly` (recette d'exemple) : on les voit, sans ajout ni suppression.
export default function StepPhotos({
  recipeId,
  step,
  photos,
  onAdd,
  onDelete,
  readOnly = false,
}: {
  recipeId: string
  // Place de l'étape dans recipe.steps (à partir de 0)
  step: number
  photos: StepPhoto[]
  onAdd: (photo: StepPhoto) => void
  onDelete: (photoId: string) => void
  readOnly?: boolean
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (readOnly && !photos.length) return null

  function add(file: File | undefined) {
    if (!file) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await addStepPhoto(recipeId, step, await shrinkPhoto(file))
        if ('id' in result && result.id) onAdd({ id: result.id, step })
        else setError(('error' in result && result.error) || 'Impossible d’ajouter cette photo.')
      } catch {
        setError('Impossible d’ajouter cette photo.')
      }
    })
  }

  function remove(photoId: string) {
    if (!window.confirm('Supprimer cette photo ?')) return
    setOpen(null)
    onDelete(photoId)
    startTransition(() => deleteStepPhoto(recipeId, photoId))
  }

  const tile = 'shrink-0 w-40 aspect-[4/3] rounded-2xl overflow-hidden'

  return (
    <div className="mt-6">
      <ul className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" aria-label="Photos de l’étape">
        {photos.map(photo => (
          <li key={photo.id} className={tile}>
            <button type="button" onClick={() => setOpen(photo.id)} aria-label="Voir la photo en grand" className="block w-full h-full bg-coconut">
              {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite */}
              <img src={stepPhotoUrl(recipeId, photo.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          </li>
        ))}
        {!readOnly && (
          <li className={tile}>
            <label className="w-full h-full border-2 border-dashed border-line rounded-2xl flex flex-col items-center justify-center gap-1 text-sm text-ink-muted hover:bg-coconut cursor-pointer">
              <Icon name="camera" />
              {pending ? 'Envoi…' : 'Photo de l’étape'}
              <input type="file" accept="image/*" className="sr-only" disabled={pending} onChange={e => { add(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          </li>
        )}
      </ul>
      {error && <p role="alert" className="text-sm text-pink-deep mt-2">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Photo de l’étape">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Fermer" onClick={() => setOpen(null)} />
          <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route */}
            <img src={stepPhotoUrl(recipeId, open)} alt="" className="w-full max-h-[60vh] object-contain rounded-3xl bg-coconut" />
            {readOnly ? (
              <button type="button" onClick={() => setOpen(null)} className="btn">OK</button>
            ) : (
              <button type="button" onClick={() => remove(open)} className="btn-danger">
                <Icon name="trash" size={20} /> Supprimer la photo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
