'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'
import { FEATURES } from '@/lib/ui/features'
import { createPhotoAlbum } from '@/app/(app)/photos/actions'

// Barre du bas de l'onglet Photos : « Nouvel album », qui le crée sur le NAS, partagé avec le foyer
// (et, au choix, avec le groupe Famille réglé dans Réglages › NAS)
export default function NewAlbum({ canShareWithFamily }: { canShareWithFamily: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [family, setFamily] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await createPhotoAlbum(name, family)
      if (!result.ok) return setError(result.error)
      setOpen(false)
      router.push(`/photos/${result.ref}`)
    })
  }

  return (
    <>
      <ActionBar detached>
        <span />
        <button type="button" className={`btn-feature btn-lg pointer-events-auto ${FEATURES.photos.fill}`} onClick={() => setOpen(true)}>
          <Icon name="plus" /> Nouvel album
        </button>
      </ActionBar>
      {open && (
        <Sheet title="Nouvel album" onClose={() => setOpen(false)}>
          <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); create() }}>
            <input
              className="field"
              placeholder="Nom de l’album"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              autoFocus
              required
            />
            {canShareWithFamily && (
              <button type="button" className={`chip self-start ${family ? 'is-active' : ''}`} aria-pressed={family} onClick={() => setFamily(f => !f)}>
                <Icon name={family ? 'check' : 'users'} size={18} /> Partager avec Famille
              </button>
            )}
            {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
            <button type="submit" className={`btn-feature ${FEATURES.photos.fill}`} disabled={pending || !name.trim()}>
              {pending ? 'Création…' : 'Créer l’album'}
            </button>
          </form>
        </Sheet>
      )}
    </>
  )
}
