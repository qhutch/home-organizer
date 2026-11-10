'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import PhotoCropper from '@/components/recipes/PhotoCropper'
import { deleteRecipePhoto, replaceRecipePhoto, setRecipeCover } from '@/app/(app)/recipes/actions'
import { photoUrl } from '@/lib/recipes/photo'
import { FEATURES } from '@/lib/ui/features'

// Page d'une photo de recette (/recipes/{id}/photo/{photoId}), ouverte depuis le carrousel du haut ou la section Photos :
// la photo en grand, « Choisir comme photo principale », « Recadrer » (avec rotation) et « Supprimer la photo ».
// Chaque action ramène à la recette.
export default function PhotoEditor({ recipeId, photoId, isCover }: { recipeId: string; photoId: string; isCover: boolean }) {
  const router = useRouter()
  const [cropping, setCropping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function backToRecipe() {
    router.replace(`/recipes/${recipeId}`)
    router.refresh()
  }

  function run(action: () => Promise<{ error?: string } | { id: string } | void>) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (result && 'error' in result && result.error) setError(result.error)
        else backToRecipe()
      } catch {
        setError('Ça n’a pas marché. Réessaie.')
      }
    })
  }

  function remove() {
    if (!window.confirm('Supprimer cette photo ?')) return
    run(() => deleteRecipePhoto(recipeId, photoId))
  }

  if (cropping) {
    return (
      <div className="flex flex-col gap-3">
        <PhotoCropper
          src={photoUrl(recipeId, photoId)}
          onDone={photo => run(() => replaceRecipePhoto(recipeId, photoId, photo))}
          onCancel={() => setCropping(false)}
          pending={pending}
        />
        {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route */}
      <img src={photoUrl(recipeId, photoId)} alt="" className="w-full max-h-[60vh] object-contain rounded-3xl bg-coconut" />
      {!isCover ? (
        <button type="button" onClick={() => run(() => setRecipeCover(recipeId, photoId))} disabled={pending} className={`btn-feature ${FEATURES.recipes.fill}`}>
          <Icon name="star" size={20} /> Choisir comme photo principale
        </button>
      ) : (
        <p className="text-sm text-center text-ink-muted">C’est la photo principale.</p>
      )}
      <button type="button" onClick={() => setCropping(true)} disabled={pending} className={`btn-feature-outline ${FEATURES.recipes.text}`}>
        <Icon name="crop" size={20} /> Recadrer
      </button>
      <button type="button" onClick={remove} disabled={pending} className="btn-danger">
        <Icon name="trash" size={20} /> Supprimer la photo
      </button>
      {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
    </div>
  )
}
