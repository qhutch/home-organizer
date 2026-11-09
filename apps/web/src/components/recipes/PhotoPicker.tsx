'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { shrinkPhoto } from '@/lib/recipes/photo'

export type PickedPhoto = { blob: Blob; url: string }

// Choix d'une photo (galerie ou appareil), réduite tout de suite et montrée en aperçu.
export default function PhotoPicker({ photo, onChange }: { photo: PickedPhoto | null; onChange: (photo: PickedPhoto) => void }) {
  const [error, setError] = useState<string | null>(null)

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const blob = await shrinkPhoto(file)
      if (photo) URL.revokeObjectURL(photo.url)
      onChange({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setError('Impossible d’utiliser cette photo.')
    }
  }

  return (
    <div>
      <label className="block cursor-pointer">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local
          <img src={photo.url} alt="Photo choisie" className="w-full aspect-[4/3] object-cover rounded-3xl bg-coconut" />
        ) : (
          <span className="w-full h-40 rounded-3xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-sm text-ink-muted hover:bg-coconut">
            <Icon name="plus" /> Ajouter une photo
          </span>
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      {photo && <p className="text-xs text-ink-muted mt-2">Touche la photo pour en choisir une autre.</p>}
      {error && <p className="text-sm text-pink-deep mt-2">{error}</p>}
    </div>
  )
}
