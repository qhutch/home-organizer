'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sheet from '@/components/ui/Sheet'
import { deletePhotoAlbum } from '@/app/(app)/photos/actions'

// « Supprimer l'album », en bas d'un album qu'on a créé dans Hestia : une fiche demande si les photos partent aussi
export default function DeleteAlbum({ album, name }: { album: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'album' | 'photos' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(withPhotos: boolean) {
    setBusy(withPhotos ? 'photos' : 'album')
    setError(null)
    const result = await deletePhotoAlbum(album, withPhotos)
    if (!result.ok) {
      setBusy(null)
      setError(result.error)
      return
    }
    router.replace('/photos')
  }

  return (
    <div className="mt-8 flex justify-end">
      <button type="button" onClick={() => setOpen(true)} className="btn-danger">Supprimer l’album</button>
      {open && (
        <Sheet title={`Supprimer « ${name} »`} onClose={() => { if (!busy) setOpen(false) }}>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => remove(false)} disabled={busy !== null} className="btn-danger">
              {busy === 'album' ? 'Suppression…' : 'Supprimer l’album, garder les photos'}
            </button>
            <button type="button" onClick={() => remove(true)} disabled={busy !== null} className="btn-danger">
              {busy === 'photos' ? 'Suppression…' : 'Supprimer l’album et ses photos'}
            </button>
          </div>
          {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
        </Sheet>
      )}
    </div>
  )
}
