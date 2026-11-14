'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'
import { FEATURES } from '@/lib/ui/features'
import { createPhotoAlbum } from '@/app/(app)/photos/actions'
import type { AccessRole } from '@/lib/photos/synology'
import type { AccessTarget } from './AlbumMenu'
import { pickPhotos, sendPhotos, UploadScreen, type UploadState } from './upload'

const chipClass = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`
const key = (m: { type: string; id: number }) => `${m.type}:${m.id}`
const LEVELS: { role: AccessRole | null; label: string }[] = [
  { role: null, label: 'Aucun accès' },
  { role: 'download', label: 'Voir' },
  { role: 'upload', label: 'Ajouter des photos' },
]

// « Nouvel album » : d'abord les photos (photothèque de l'iPhone), puis le nom et qui y a accès,
// puis l'écran d'envoi ; à la fin, on arrive dans l'album.
// Par défaut, les membres du foyer peuvent ajouter des photos, Famille n'a pas accès.
export default function NewAlbum({ targets }: { targets: AccessTarget[] }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[] | null>(null)
  const [name, setName] = useState('')
  const [roles, setRoles] = useState<Record<string, AccessRole | null>>(
    () => Object.fromEntries(targets.map(t => [key(t), t.type === 'user' ? 'upload' : null])),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [upload, setUpload] = useState<UploadState | null>(null)
  const [album, setAlbum] = useState<string | null>(null)

  function start() {
    pickPhotos(
      waiting => setUpload(s => waiting ? { step: 'waiting' } : s?.step === 'waiting' ? null : s),
      picked => {
        setFiles(picked)
        setError(null)
      },
    )
  }

  async function create() {
    if (!files) return
    setBusy(true)
    setError(null)
    const access = targets.flatMap(t => {
      const role = roles[key(t)]
      return role ? [{ type: t.type, id: t.id, role }] : []
    })
    const result = await createPhotoAlbum(name, access)
    setBusy(false)
    if (!result.ok) return setError(result.error)
    setAlbum(result.ref)
    setFiles(null)
    setUpload({ step: 'sending', done: 0, total: files.length })
    const errors = await sendPhotos(result.ref, files, done => setUpload({ step: 'sending', done, total: files.length }))
    setUpload({ step: 'done', total: files.length, errors })
  }

  return (
    <>
      <ActionBar detached>
        <span />
        <button type="button" className={`btn-feature btn-lg pointer-events-auto ${FEATURES.photos.fill}`} onClick={start}>
          <Icon name="plus" /> Nouvel album
        </button>
      </ActionBar>
      {files && (
        <Sheet title="Nouvel album" onClose={() => setFiles(null)}>
          <p className="text-sm text-ink-muted -mt-3">{files.length} {files.length > 1 ? 'photos' : 'photo'}</p>
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
            <ul className="flex flex-col gap-2">
              {targets.map(t => (
                <li key={key(t)} className="card flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon name={t.type === 'group' ? 'users' : 'user'} size={20} /> {t.name}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {LEVELS.map(level => {
                      const role = roles[key(t)] ?? null
                      const active = level.role === null ? role === null : level.role === role
                      return (
                        <button
                          key={level.label}
                          type="button"
                          className={chipClass(active)}
                          aria-pressed={active}
                          onClick={() => setRoles(r => ({ ...r, [key(t)]: level.role }))}
                        >
                          {level.label}
                        </button>
                      )
                    })}
                  </span>
                </li>
              ))}
            </ul>
            {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
            <button type="submit" className={`btn-feature ${FEATURES.photos.fill}`} disabled={busy || !name.trim()}>
              {busy ? 'Création…' : 'Créer l’album'}
            </button>
          </form>
        </Sheet>
      )}
      {upload && (
        <UploadScreen
          state={upload}
          onClose={() => {
            if (upload.step === 'sending') return
            setUpload(null)
            if (album) router.push(`/photos/${album}`)
          }}
        />
      )}
    </>
  )
}
