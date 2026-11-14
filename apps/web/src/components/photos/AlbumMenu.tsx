'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'
import { FEATURES } from '@/lib/ui/features'
import { updateAlbumAccess } from '@/app/(app)/photos/actions'
import type { AccessRole, AlbumAccess } from '@/lib/photos/synology'

export type AccessTarget = { type: 'user' | 'group'; id: number; name: string }

const chipClass = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`
const key = (m: { type: string; id: number }) => `${m.type}:${m.id}`

// Les trois niveaux d'accès proposés ; « Voir » permet aussi de télécharger
const LEVELS: { role: AccessRole | null; label: string }[] = [
  { role: null, label: 'Aucun accès' },
  { role: 'download', label: 'Voir' },
  { role: 'upload', label: 'Ajouter des photos' },
]

// « … » d'un album : qui y a accès.
// Album créé par Hestia : les membres du foyer et Famille sont toujours listés, avec leur niveau d'accès à choisir,
// puis toute autre personne déjà invitée, et « Partager avec… » pour en ajouter.
// Album de quelqu'un d'autre : lecture seule (seul son créateur peut changer ses partages, dans Synology Photos).
export default function AlbumMenu({ album, editable, owner, access: initial, pinned, targets }: {
  album: string
  editable: boolean
  owner: string | null
  access: AlbumAccess[]
  // Comptes des membres du foyer et groupe Famille, toujours affichés
  pinned: AccessTarget[]
  // Tous les comptes et groupes du NAS
  targets: AccessTarget[]
}) {
  const [open, setOpen] = useState(false)
  const [access, setAccess] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const roleOf = (t: AccessTarget) => access.find(a => key(a) === key(t))?.role ?? null
  const rows = [...pinned, ...access.filter(a => !pinned.some(p => key(p) === key(a)))]
  const others = targets.filter(t => !rows.some(r => key(r) === key(t)))

  function change(member: AccessTarget, role: AccessRole | null) {
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
            {(editable ? rows : access).map(member => {
              const role = roleOf(member)
              return (
                <li key={key(member)} className="card flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Icon name={member.type === 'group' ? 'users' : 'user'} size={20} />
                    <span className="flex-1 min-w-0 truncate text-sm font-medium">{member.name}</span>
                    {!editable && (
                      <span className="text-xs text-ink-muted">{role === 'upload' ? 'Ajoute des photos' : 'Voit l’album'}</span>
                    )}
                  </div>
                  {editable && (
                    <div className="flex flex-wrap gap-2">
                      {LEVELS.map(level => {
                        const active = level.role === null ? role === null
                          : level.role === 'upload' ? role === 'upload' : role === 'view' || role === 'download'
                        return (
                          <button
                            key={level.label}
                            type="button"
                            className={chipClass(active)}
                            aria-pressed={active}
                            onClick={() => { if (!active) change(member, level.role) }}
                          >
                            {level.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
            {!editable && access.length === 0 && <li className="text-sm text-ink-muted">Partagé avec personne</li>}
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
