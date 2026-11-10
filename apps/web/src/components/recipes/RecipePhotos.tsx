'use client'

import { useRef, useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PhotoEditor from '@/components/recipes/PhotoEditor'
import { addRecipePhoto } from '@/app/(app)/recipes/actions'
import { photoUrl, shrinkPhoto } from '@/lib/recipes/photo'
import type { RecipePhoto } from '@/types/database'

// Photos d'une recette : on en ajoute à chaque fois qu'on la cuisine,
// et on en touche une pour ouvrir sa page (PhotoEditor) : photo principale, recadrer, supprimer.
// inPlace (formulaire « Modifier la recette ») : la photo s'ouvre ici même, sans quitter le formulaire.
export default function RecipePhotos({ recipeId, photos, coverPhotoId, inPlace = false }: { recipeId: string; photos: RecipePhoto[]; coverPhotoId: string | null; inPlace?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
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
        else router.refresh()
      } catch {
        setError('Impossible d’ajouter cette photo.')
      }
    })
  }

  const heading = inPlace
    ? <h2 className="eyebrow mb-2">Photos</h2>
    : <h2 className="font-display font-semibold text-lg mb-3">Photos</h2>

  if (open && photos.some(p => p.id === open)) {
    return (
      <section className={inPlace ? '' : 'card mb-2'}>
        {heading}
        <PhotoEditor recipeId={recipeId} photoId={open} isCover={open === coverPhotoId} onClose={() => setOpen(null)} />
      </section>
    )
  }

  const tileClass = (cover: boolean) => `relative block w-full aspect-square rounded-2xl overflow-hidden bg-coconut ${cover ? 'outline-2 outline-offset-2 outline-pink-deep' : ''}`
  const tileContent = (photo: RecipePhoto) => (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite */}
      <img src={photoUrl(recipeId, photo.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
      {photo.id === coverPhotoId && (
        <span className="absolute left-1.5 bottom-1.5 rounded-full bg-surface text-pink-deep text-[11px] font-semibold px-2 py-0.5">Principale</span>
      )}
    </>
  )

  return (
    <section className={inPlace ? '' : 'card mb-2'}>
      {heading}
      <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map(photo => (
          <li key={photo.id}>
            {inPlace ? (
              <button type="button" onClick={() => setOpen(photo.id)} aria-label={photo.id === coverPhotoId ? 'Photo principale' : 'Ouvrir la photo'} className={tileClass(photo.id === coverPhotoId)}>
                {tileContent(photo)}
              </button>
            ) : (
              <Link href={`/recipes/${recipeId}/photo/${photo.id}`} aria-label={photo.id === coverPhotoId ? 'Photo principale' : 'Ouvrir la photo'} className={tileClass(photo.id === coverPhotoId)}>
                {tileContent(photo)}
              </Link>
            )}
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
