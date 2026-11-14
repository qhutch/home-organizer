'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { refreshAlbum, uploadAlbumPhoto } from '@/app/(app)/photos/actions'

// Une photo passe telle quelle sous cette taille ; au-dessus, on la réencode en JPEG (et la réduit si besoin)
const PHOTO_MAX = 3_800_000

// Réduit une photo trop lourde pour l'envoi, sans différence visible : JPEG 90 %, puis plus petite si nécessaire
async function fitForUpload(file: File): Promise<File> {
  if (file.size <= PHOTO_MAX && file.type === 'image/jpeg') return file
  const bitmap = await createImageBitmap(file)
  let scale = 1
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (blob && blob.size <= PHOTO_MAX) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified })
    }
    scale *= 0.8
  }
  throw new Error('trop lourde')
}

// Barre du bas d'un album créé par Hestia : « Ajouter des photos » ouvre la photothèque, puis envoie une à une
export default function AddPhotos({ album }: { album: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  async function send(files: File[]) {
    setErrors([])
    const failed: string[] = []
    setProgress({ done: 0, total: files.length })
    for (const [i, original] of files.entries()) {
      try {
        const file = await fitForUpload(original)
        const form = new FormData()
        form.append('album', album)
        form.append('file', file)
        form.append('mtime', String(Math.floor(original.lastModified / 1000)))
        const result = await uploadAlbumPhoto(form)
        if (!result.ok) failed.push(result.error)
      } catch {
        failed.push(`${original.name} : impossible à lire`)
      }
      setProgress({ done: i + 1, total: files.length })
    }
    await refreshAlbum(album)
    setProgress(null)
    setErrors(failed)
    router.refresh()
  }

  return (
    <>
      {errors.length > 0 && (
        <div className="card mt-4 flex flex-col gap-1" role="alert">
          {errors.map((e, i) => <p key={i} className="text-sm text-pink-deep">{e}</p>)}
        </div>
      )}
      <ActionBar detached>
        <span />
        <button
          type="button"
          className={`btn-feature btn-lg pointer-events-auto ${FEATURES.photos.fill}`}
          disabled={progress !== null}
          onClick={() => input.current?.click()}
        >
          <Icon name="plus" />
          {progress ? `Envoi… ${progress.done} / ${progress.total}` : 'Ajouter des photos'}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) send(files)
          }}
        />
      </ActionBar>
    </>
  )
}
