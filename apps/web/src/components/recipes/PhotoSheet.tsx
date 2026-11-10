'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import PhotoCropper from '@/components/recipes/PhotoCropper'
import { deleteRecipePhoto, replaceRecipePhoto, setRecipeCover } from '@/app/(app)/recipes/actions'
import { photoUrl } from '@/lib/recipes/photo'
import { FEATURES } from '@/lib/ui/features'

// Fiche d'une photo de recette, ouverte depuis le carrousel du haut ou la section Photos :
// la photo en grand, « Choisir comme photo principale », « Recadrer » et « Supprimer la photo ».
export default function PhotoSheet({ recipeId, photoId, isCover, onClose }: {
  recipeId: string
  photoId: string
  isCover: boolean
  onClose: () => void
}) {
  const [cropping, setCropping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function makeCover() {
    onClose()
    startTransition(() => setRecipeCover(recipeId, photoId))
  }

  function remove() {
    if (!window.confirm('Supprimer cette photo ?')) return
    onClose()
    startTransition(() => deleteRecipePhoto(recipeId, photoId))
  }

  function saveCrop(photo: Blob) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await replaceRecipePhoto(recipeId, photoId, photo)
        if (result?.error) setError(result.error)
        else onClose()
      } catch {
        setError('La photo n’a pas pu être enregistrée. Réessaie.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Photo">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Fermer" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3 max-h-[95vh] overflow-y-auto">
        {cropping ? (
          <PhotoCropper src={photoUrl(recipeId, photoId)} onDone={saveCrop} onCancel={() => setCropping(false)} pending={pending} />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route */}
            <img src={photoUrl(recipeId, photoId)} alt="" className="w-full max-h-[60vh] object-contain rounded-3xl bg-coconut" />
            {!isCover ? (
              <button type="button" onClick={makeCover} className={`btn-feature ${FEATURES.recipes.fill}`}>
                <Icon name="star" size={20} /> Choisir comme photo principale
              </button>
            ) : (
              <p className="text-sm text-center text-ink-muted">C’est la photo principale.</p>
            )}
            <button type="button" onClick={() => setCropping(true)} className={`btn-feature-outline ${FEATURES.recipes.text}`}>
              <Icon name="crop" size={20} /> Recadrer
            </button>
            <button type="button" onClick={remove} className="btn-danger">
              <Icon name="trash" size={20} /> Supprimer la photo
            </button>
          </>
        )}
        {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
      </div>
    </div>
  )
}
