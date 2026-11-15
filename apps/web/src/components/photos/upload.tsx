'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { uploadAlbumPhoto } from '@/app/(app)/photos/actions'
import { FEATURES } from '@/lib/ui/features'

// Une photo passe telle quelle sous cette taille ; au-dessus, on la réencode en JPEG (et la réduit si besoin)
const PHOTO_MAX = 3_800_000

// Prépare une photo pour l'envoi, une à la fois pendant l'envoi (et non dans la photothèque, qui bloquait sur
// les gros lots) : les photos d'iPhone (HEIC) deviennent des JPEG 90 %, réduits si besoin sous la limite.
// Si le navigateur ne sait pas lire la photo, on envoie l'originale quand elle n'est pas trop lourde.
async function fitForUpload(file: File): Promise<File> {
  if (file.size <= PHOTO_MAX && file.type === 'image/jpeg') return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    if (file.size <= PHOTO_MAX) return file
    throw new Error('illisible')
  }
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

// Photos déjà envoyées dans un album, retenues sur ce téléphone : si un gros envoi est coupé
// (écran verrouillé, réseau), on peut reprendre la même sélection sans doublons.
const sentKey = (album: string) => `hestia-sent-${album}`
const fileId = (file: File) => `${file.name}|${file.size}|${file.lastModified}`
function readSent(album: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(sentKey(album)) ?? '[]') as string[]) } catch { return new Set() }
}
function writeSent(album: string, sent: Set<string>) {
  try { localStorage.setItem(sentKey(album), JSON.stringify([...sent].slice(-5000))) } catch { /* stockage indisponible */ }
}

// Garde l'écran allumé pendant l'envoi (sinon l'iPhone se verrouille et l'envoi s'arrête)
async function keepAwake() {
  try {
    return await (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } })
      .wakeLock?.request('screen') ?? null
  } catch {
    return null
  }
}

// Trois envois à la fois : bien plus rapide pour des centaines de photos, sans saturer le NAS
const PARALLEL = 3

// Envoie les photos dans un album créé par Hestia ; rend les erreurs (une par photo ratée)
export async function sendPhotos(album: string, files: File[], onProgress: (done: number) => void): Promise<string[]> {
  const failed: string[] = []
  const sent = readSent(album)
  const lock = await keepAwake()
  let done = 0
  let next = 0
  async function worker() {
    while (next < files.length) {
      const original = files[next++]
      if (!sent.has(fileId(original))) {
        try {
          const file = await fitForUpload(original)
          const form = new FormData()
          form.append('album', album)
          form.append('file', file)
          form.append('mtime', String(Math.floor(original.lastModified / 1000)))
          const result = await uploadAlbumPhoto(form)
          if (result.ok) {
            sent.add(fileId(original))
            writeSent(album, sent)
          } else failed.push(result.error)
        } catch {
          failed.push(`${original.name} : impossible à lire`)
        }
      }
      onProgress(++done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, worker))
  await lock?.release().catch(() => {})
  return failed
}

// Ouvre la photothèque. « waiting » s'affiche pendant que l'iPhone prépare les photos choisies
// (avec beaucoup de photos, ça peut prendre un moment avant qu'on les reçoive).
export function pickPhotos(onWaiting: (waiting: boolean) => void, onPicked: (files: File[]) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  // Les formats acceptés tels quels : l'iPhone donne alors les photos d'origine (HEIC) sans les convertir
  // toutes avant de rendre la main (c'est ce qui bloquait avec des centaines de photos) ; on convertit pendant l'envoi
  input.accept = 'image/heic,image/heif,image/jpeg,image/png,image/webp'
  input.multiple = true
  input.addEventListener('change', () => {
    onWaiting(false)
    const files = Array.from(input.files ?? [])
    if (files.length) onPicked(files)
  })
  input.addEventListener('cancel', () => onWaiting(false))
  onWaiting(true)
  input.click()
}

export type UploadState =
  | { step: 'waiting' }
  | { step: 'sending'; done: number; total: number }
  | { step: 'done'; total: number; errors: string[] }

// Écran plein d'envoi, par-dessus tout : on voit où on en est, et on ne peut pas repartir sans le vouloir
export function UploadScreen({ state, onClose }: { state: UploadState; onClose: () => void }) {
  // Prévenir avant de quitter la page pendant l'envoi
  useEffect(() => {
    if (state.step !== 'sending') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [state.step])

  // Pendant le choix des photos : la page reste visible derrière, assombrie, avec une petite fiche en bas
  // (comme Sheet), par-dessus laquelle s'ouvre la photothèque de l'iPhone
  if (state.step === 'waiting') {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-live="polite">
        <div data-veil className="absolute inset-0 bg-ink/40" />
        <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center gap-3">
          <p className="font-display font-semibold text-xl flex-1">Choix des photos…</p>
          <button type="button" className="btn-outline" onClick={onClose}>Annuler</button>
        </div>
      </div>,
      document.body,
    )
  }

  const percent = state.step === 'sending' ? Math.round((state.done / state.total) * 100) : state.step === 'done' ? 100 : 0
  return createPortal(
    <div data-screen className="fixed inset-0 z-50 bg-page flex flex-col items-center justify-center gap-5 px-8 text-center" role="dialog" aria-modal="true" aria-live="polite">
      {state.step === 'sending' && (
        <>
          <p className="font-display font-semibold text-2xl">Envoi des photos</p>
          <p className="big-number text-prune-deep">{state.done} / {state.total}</p>
          <div className="w-full max-w-xs h-2 rounded-full bg-prune-soft overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-prune transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-sm text-ink-muted">Garde Hestia ouverte jusqu’à la fin. Si l’envoi est coupé, refais la même sélection : les photos déjà envoyées sont passées.</p>
        </>
      )}
      {state.step === 'done' && (
        <>
          <p className="font-display font-semibold text-2xl">
            {state.errors.length === 0 ? 'C’est dans l’album !' : `${state.total - state.errors.length} / ${state.total} photos envoyées`}
          </p>
          {state.errors.length > 0 && (
            <ul className="text-sm text-pink-deep max-h-40 overflow-y-auto">
              {state.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <button type="button" className={`btn-feature ${FEATURES.photos.fill}`} onClick={onClose}>Voir l’album</button>
        </>
      )}
    </div>,
    document.body,
  )
}
