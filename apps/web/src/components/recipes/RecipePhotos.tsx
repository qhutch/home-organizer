'use client'

import { useRef, useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import Link from 'next/link'
import { addRecipePhoto } from '@/app/(app)/recipes/actions'
import { photoUrl, shrinkPhoto } from '@/lib/recipes/photo'
import type { RecipePhoto } from '@/types/database'

// Photos d'une recette : on en ajoute à chaque fois qu'on la cuisine,
// et on en touche une pour ouvrir sa page (PhotoEditor) : photo principale, recadrer, supprimer.
export default function RecipePhotos({ recipeId, photos, coverPhotoId }: { recipeId: string; photos: RecipePhoto[]; coverPhotoId: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
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

  return (
    <section className="card mb-2">
      <h2 className="font-display font-semibold text-lg mb-3">Photos</h2>
      <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map(photo => (
          <li key={photo.id}>
            <Link
              href={`/recipes/${recipeId}/photo/${photo.id}`}
              aria-label={photo.id === coverPhotoId ? 'Photo principale' : 'Ouvrir la photo'}
              className={`relative block w-full aspect-square rounded-2xl overflow-hidden bg-coconut ${photo.id === coverPhotoId ? 'outline-2 outline-offset-2 outline-pink-deep' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite */}
              <img src={photoUrl(recipeId, photo.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
              {photo.id === coverPhotoId && (
                <span className="absolute left-1.5 bottom-1.5 rounded-full bg-surface text-pink-deep text-[11px] font-semibold px-2 py-0.5">Principale</span>
              )}
            </Link>
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

    </section>
  )
}
