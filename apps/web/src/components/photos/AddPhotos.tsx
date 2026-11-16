'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ActionBar from '@/components/ui/ActionBar'
import Sheet from '@/components/ui/Sheet'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { refreshAlbum } from '@/app/(app)/photos/actions'
import { pickPhotos, sendPhotos, UploadScreen, type UploadState } from './upload'

// Barre du bas d'un album créé par Hestia : « Ajouter des photos » propose le téléphone (photothèque, puis l'écran d'envoi)
// ou les photos déjà sur le NAS (/photos/{album}/ajouter : on les prend dans un autre album)
export default function AddPhotos({ album }: { album: string }) {
  const router = useRouter()
  const [state, setState] = useState<UploadState | null>(null)
  const [choosing, setChoosing] = useState(false)

  function add() {
    setChoosing(false)
    pickPhotos(
      waiting => setState(s => waiting ? { step: 'waiting' } : s?.step === 'waiting' ? null : s),
      async files => {
        setState({ step: 'sending', done: 0, total: files.length })
        const errors = await sendPhotos(album, files, done => setState({ step: 'sending', done, total: files.length }))
        await refreshAlbum(album)
        setState({ step: 'done', total: files.length, errors })
      },
    )
  }

  return (
    <>
      <ActionBar detached>
        <span />
        <button type="button" className={`btn-feature btn-lg pointer-events-auto ${FEATURES.photos.fill}`} onClick={() => setChoosing(true)}>
          <Icon name="plus" /> Ajouter des photos
        </button>
      </ActionBar>
      {choosing && (
        <Sheet title="Ajouter des photos" onClose={() => setChoosing(false)}>
          <div className="flex flex-col gap-2">
            <button type="button" className={`btn-feature btn-lg ${FEATURES.photos.fill}`} onClick={add}>
              <Icon name="photoPlus" /> Depuis le téléphone
            </button>
            <Link href={`/photos/${album}/ajouter`} className={`btn-feature-outline btn-lg ${FEATURES.photos.text}`}>
              <Icon name="library" /> Déjà sur le NAS
            </Link>
          </div>
        </Sheet>
      )}
      {state && (
        <UploadScreen
          state={state}
          onClose={() => {
            if (state.step === 'sending') return
            setState(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
