'use client'

import { useRef, useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import { addRecipePhoto, deleteRecipePhoto, setRecipeCover } from '@/app/(app)/recipes/actions'
import { photoUrl, shrinkPhoto } from '@/lib/recipes/photo'
import type { RecipePhoto } from '@/types/database'

// Photos d'une recette : on en ajoute à chaque fois qu'on la cuisine,
// et on choisit celle qui sert de photo principale (bibliothèque, haut de la fiche).
export default function RecipePhotos({ recipeId, photos, coverPhotoId }: { recipeId: string; photos: RecipePhoto[]; coverPhotoId: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function add(file: File | undefined) {
    if (!file) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await addRecipePhoto(recipeId, await shrinkPhoto(file))
        if (result?.error) setError(result.error)
      } catch {
        setError('Impossible d’ajouter cette photo.')
      }
    })
  }

  function makeCover(photoId: string) {
    setOpen(null)
    startTransition(() => setRecipeCover(recipeId, photoId))
  }

  function remove(photoId: string) {
    if (!window.confirm('Supprimer cette photo ?')) return
    setOpen(null)
    startTransition(() => deleteRecipePhoto(recipeId, photoId))
  }

  return (
    <section className="card mb-2">
      <h2 className="font-display font-semibold text-lg mb-1">Photos</h2>
      <p className="text-xs text-ink-muted mb-3">Touche une photo pour la choisir comme photo principale.</p>
      <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map(photo => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpen(photo.id)}
              aria-label={photo.id === coverPhotoId ? 'Photo principale' : 'Ouvrir la photo'}
              className={`relative block w-full aspect-square rounded-2xl overflow-hidden bg-coconut ${photo.id === coverPhotoId ? 'outline-2 outline-offset-2 outline-pink-deep' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite */}
              <img src={photoUrl(recipeId, photo.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
              {photo.id === coverPhotoId && (
                <span className="absolute left-1.5 bottom-1.5 rounded-full bg-surface text-pink-deep text-[11px] font-semibold px-2 py-0.5">Principale</span>
              )}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="w-full aspect-square rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-sm text-ink-muted hover:bg-coconut"
          >
            <Icon name="plus" />
            {pending ? 'Envoi…' : 'Ajouter'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { add(e.target.files?.[0]); e.target.value = '' }} />
        </li>
      </ul>
      {error && <p className="text-sm text-pink-deep mt-2">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Photo">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Fermer" onClick={() => setOpen(null)} />
          <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route */}
            <img src={photoUrl(recipeId, open)} alt="" className="w-full max-h-[60vh] object-contain rounded-3xl bg-coconut" />
            {open !== coverPhotoId ? (
              <button type="button" onClick={() => makeCover(open)} className="btn">
                <Icon name="star" size={20} /> Choisir comme photo principale
              </button>
            ) : (
              <p className="text-sm text-center text-ink-muted">C’est la photo principale.</p>
            )}
            <button type="button" onClick={() => remove(open)} className="btn-outline !text-pink-deep !border-pink-deep">
              <Icon name="trash" size={20} /> Supprimer la photo
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
