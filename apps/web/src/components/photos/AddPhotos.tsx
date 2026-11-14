'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { refreshAlbum } from '@/app/(app)/photos/actions'
import { pickPhotos, sendPhotos, UploadScreen, type UploadState } from './upload'

// Barre du bas d'un album créé par Hestia : « Ajouter des photos » ouvre la photothèque, puis l'écran d'envoi
export default function AddPhotos({ album }: { album: string }) {
  const router = useRouter()
  const [state, setState] = useState<UploadState | null>(null)

  function add() {
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
        <button type="button" className={`btn-feature btn-lg pointer-events-auto ${FEATURES.photos.fill}`} onClick={add}>
          <Icon name="plus" /> Ajouter des photos
        </button>
      </ActionBar>
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
