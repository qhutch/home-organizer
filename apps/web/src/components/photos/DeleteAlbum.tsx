'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { deletePhotoAlbum } from '@/app/(app)/photos/actions'

// « Supprimer l'album », en bas de la fiche « … » d'un album qu'on a créé dans Hestia : supprime l'album et ses photos
export default function DeleteAlbum({ album, name }: { album: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm(`Supprimer l’album « ${name} » et ses photos ?`)) return
    setBusy(true)
    const result = await deletePhotoAlbum(album)
    if (!result.ok) {
      setBusy(false)
      window.alert(result.error)
      return
    }
    router.replace('/photos')
  }

  return (
    <button type="button" onClick={remove} disabled={busy} className="btn-danger">
      <Icon name="trash" /> {busy ? 'Suppression…' : 'Supprimer l’album'}
    </button>
  )
}
