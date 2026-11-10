'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import { addStepPhoto, deleteStepPhoto } from '@/app/(app)/recipes/actions'
import { shrinkPhoto, stepPhotoUrl } from '@/lib/recipes/photo'
import type { StepPhoto as StepPhotoType } from '@/types/database'

// La photo d'une étape, en grand en haut de l'écran du mode cuisine. Une seule par étape :
// en ajouter une remplace l'ancienne. Elle reste à part des photos du plat (voir getStepPhotos).
// Sans photo, une case en pointillés pour en ajouter une. On touche la photo pour la voir en entier,
// la changer ou la supprimer.
export default function StepPhoto({
  recipeId,
  step,
  photo,
  onChange,
}: {
  recipeId: string
  // Place de l'étape dans recipe.steps (à partir de 0)
  step: number
  photo: StepPhotoType | null
  onChange: (photo: StepPhotoType | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function add(file: File | undefined) {
    if (!file) return
    setError(null)
    setOpen(false)
    startTransition(async () => {
      try {
        const result = await addStepPhoto(recipeId, step, await shrinkPhoto(file))
        if ('id' in result && result.id) onChange({ id: result.id, step })
        else setError(('error' in result && result.error) || 'Impossible d’ajouter cette photo.')
      } catch {
        setError('Impossible d’ajouter cette photo.')
      }
    })
  }

  function remove() {
    if (!photo || !window.confirm('Supprimer cette photo ?')) return
    setOpen(false)
    onChange(null)
    startTransition(() => deleteStepPhoto(recipeId, photo.id))
  }

  const picker = (label: React.ReactNode, className: string) => (
    <label className={className}>
      {label}
      <input type="file" accept="image/*" className="sr-only" disabled={pending} onChange={e => { add(e.target.files?.[0]); e.target.value = '' }} />
    </label>
  )

  return (
    // Avec une photo, le bloc prend toute la hauteur libre de l'étape (au plus 45 % de l'écran),
    // et rétrécit jusqu'à 6rem pour laisser la place au texte et aux minuteurs.
    <div className={`mb-4 flex flex-col ${photo ? 'flex-1 min-h-24 max-h-[45vh]' : ''}`}>
      {photo ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="Voir la photo de l’étape" className="block w-full flex-1 min-h-0 rounded-3xl overflow-hidden bg-coconut">
          {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite */}
          <img src={stepPhotoUrl(recipeId, photo.id)} alt="" className={`w-full h-full object-cover ${pending ? 'opacity-50' : ''}`} />
        </button>
      ) : (
        picker(
          <><Icon name="camera" size={28} /> {pending ? 'Envoi…' : 'Photo de l’étape'}</>,
          'w-full h-20 rounded-3xl border-2 border-dashed border-line flex items-center justify-center gap-3 text-lg font-semibold text-ink-muted hover:bg-coconut cursor-pointer',
        )
      )}
      {error && <p role="alert" className="text-base text-pink-deep mt-2">{error}</p>}

      {open && photo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Photo de l’étape">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Fermer" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route */}
            <img src={stepPhotoUrl(recipeId, photo.id)} alt="" className="w-full max-h-[60vh] object-contain rounded-3xl bg-coconut" />
            {picker(<><Icon name="camera" /> Changer la photo</>, 'btn btn-xl cursor-pointer')}
            <button type="button" onClick={remove} className="btn-danger btn-xl">
              <Icon name="trash" /> Supprimer la photo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
