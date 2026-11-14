'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'
import { FEATURES } from '@/lib/ui/features'
import { updateAlbumAccess } from '@/app/(app)/photos/actions'
import type { AccessRole, AlbumAccess } from '@/lib/photos/synology'

type Target = { type: 'user' | 'group'; id: number; name: string }

const chipClass = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`
const key = (m: { type: string; id: number }) => `${m.type}:${m.id}`

// « … » d'un album : qui y a accès. Modifiable pour les albums créés par Hestia ; sinon, en lecture seule
// (seul le créateur de l'album peut changer ses partages dans Synology Photos).
export default function AlbumMenu({ album, editable, owner, access: initial, targets }: {
  album: string
  editable: boolean
  owner: string | null
  access: AlbumAccess[]
  targets: Target[]
}) {
  const [open, setOpen] = useState(false)
  const [access, setAccess] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const others = targets.filter(t => !access.some(a => key(a) === key(t)))

  function change(member: Target, role: AccessRole | null) {
    const before = access
    setError(null)
    setAccess(role === null
      ? access.filter(a => key(a) !== key(member))
      : access.some(a => key(a) === key(member))
        ? access.map(a => key(a) === key(member) ? { ...a, role } : a)
        : [...access, { ...member, role }])
    startTransition(async () => {
      const result = await updateAlbumAccess(album, { type: member.type, id: member.id }, role)
      if (!result.ok) {
        setAccess(before)
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button type="button" className={`icon-btn ${FEATURES.photos.text}`} aria-label="Partage de l’album" onClick={() => setOpen(true)}>
        <Icon name="dots" />
      </button>
      {open && (
        <Sheet title="Partage" onClose={() => setOpen(false)}>
          {owner && <p className="text-sm text-ink-muted -mt-3">Album de {owner}</p>}
          <ul className="flex flex-col gap-2">
            {access.length === 0 && <li className="text-sm text-ink-muted">Partagé avec personne</li>}
            {access.map(member => (
              <li key={key(member)} className="card flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon name={member.type === 'group' ? 'users' : 'user'} size={20} />
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{member.name}</span>
                  {editable ? (
                    <button type="button" className="icon-btn icon-btn-sm" aria-label={`Retirer ${member.name}`} onClick={() => change(member, null)}>
                      <Icon name="close" />
                    </button>
                  ) : (
                    <span className="text-xs text-ink-muted">{member.role === 'upload' ? 'Peut ajouter des photos' : 'Peut voir'}</span>
                  )}
                </div>
                {editable && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={chipClass(member.role !== 'upload')} aria-pressed={member.role !== 'upload'} onClick={() => change(member, 'download')}>
                      Voir
                    </button>
                    <button type="button" className={chipClass(member.role === 'upload')} aria-pressed={member.role === 'upload'} onClick={() => change(member, 'upload')}>
                      Ajouter des photos
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {editable && others.length > 0 && (
            <select
              className="field"
              value=""
              aria-label="Partager avec"
              onChange={e => {
                const target = others.find(t => key(t) === e.target.value)
                if (target) change(target, 'download')
              }}
            >
              <option value="">Partager avec…</option>
              {others.map(t => <option key={key(t)} value={key(t)}>{t.type === 'group' ? `Groupe ${t.name}` : t.name}</option>)}
            </select>
          )}
          {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
        </Sheet>
      )}
    </>
  )
}
