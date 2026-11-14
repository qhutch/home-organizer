'use client'

import { useRef, useState, useTransition } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'
import { FEATURES } from '@/lib/ui/features'
import { updateAlbumAccess } from '@/app/(app)/photos/actions'
import type { AccessRole, AlbumAccess } from '@/lib/photos/synology'

export type AccessTarget = { type: 'user' | 'group'; id: number; name: string }
type Member = AccessTarget & { role: AccessRole | null }

const key = (m: { type: string; id: number }) => `${m.type}:${m.id}`

// Les trois groupes de la fiche, du plus d'accès au moins d'accès
const GROUPS: { role: AccessRole | null; label: string; icon: IconName }[] = [
  { role: 'upload', label: 'Ajoutent des photos', icon: 'plus' },
  { role: 'download', label: 'Voient l’album', icon: 'photos' },
  { role: null, label: 'Pas d’accès', icon: 'lock' },
]
const groupOf = (role: AccessRole | null) => (role === 'upload' ? 'upload' : role ? 'download' : 'none')

// « … » d'un album : qui y a accès, en trois groupes (Ajoutent des photos, Voient l'album, Pas d'accès).
// Album créé par Hestia : on glisse une personne d'un groupe à l'autre ; « + » invite quelqu'un d'autre du NAS.
// Les membres du foyer et Famille sont toujours là (dans « Pas d'accès » s'ils n'en ont pas).
// Album de quelqu'un d'autre : les mêmes groupes, en lecture seule (seul son créateur peut changer ses partages).
export default function AlbumMenu({ album, editable, owner, access: initial, pinned, targets }: {
  album: string
  editable: boolean
  owner: string | null
  access: AlbumAccess[]
  pinned: AccessTarget[]
  targets: AccessTarget[]
}) {
  const [open, setOpen] = useState(false)
  const [access, setAccess] = useState(initial)
  const [extra, setExtra] = useState<AccessTarget[]>([])
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const roleOf = (t: AccessTarget) => access.find(a => key(a) === key(t))?.role ?? null
  const people: Member[] = [
    ...pinned,
    ...access.filter(a => !pinned.some(p => key(p) === key(a))),
    ...extra.filter(e => !pinned.some(p => key(p) === key(e)) && !access.some(a => key(a) === key(e))),
  ].map(t => ({ type: t.type, id: t.id, name: t.name, role: roleOf(t) }))
  const others = targets.filter(t => !people.some(p => key(p) === key(t)))

  function change(member: AccessTarget, role: AccessRole | null) {
    if (groupOf(roleOf(member)) === groupOf(role)) return
    const before = access
    setError(null)
    // Retiré, il reste visible dans « Pas d'accès » le temps de la fiche
    if (role === null) setExtra(e => e.some(x => key(x) === key(member)) ? e : [...e, member])
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
          <div className="flex flex-col gap-2">
            {GROUPS.map(group => {
              const members = people.filter(p => groupOf(p.role) === groupOf(group.role))
              if (!editable && group.role === null) return null
              return (
                <section
                  key={group.label}
                  data-group={groupOf(group.role)}
                  className={`rounded-3xl p-3 flex flex-col gap-2 ${group.role === null ? 'border border-dashed border-line' : 'bg-surface hairline'}`}
                >
                  <h4 className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <Icon name={group.icon} size={16} /> {group.label}
                  </h4>
                  <div className="flex flex-wrap gap-2 min-h-9">
                    {members.map(member => (
                      <PersonChip
                        key={key(member)}
                        member={member}
                        draggable={editable}
                        onDrop={target => change(member, GROUPS.find(g => groupOf(g.role) === target)!.role)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
          {editable && others.length > 0 && (
            // Le « + » ouvre la liste des autres comptes et groupes du NAS ; la personne choisie peut voir l'album
            <label className={`relative self-start pill ${FEATURES.photos.text}`}>
              <Icon name="plus" size={18} /> Ajouter quelqu’un
              <select
                className="absolute inset-0 opacity-0"
                value=""
                aria-label="Ajouter quelqu’un"
                onChange={e => {
                  const target = others.find(t => key(t) === e.target.value)
                  if (target) change(target, 'download')
                }}
              >
                <option value="">Ajouter quelqu’un</option>
                {others.map(t => <option key={key(t)} value={key(t)}>{t.type === 'group' ? `Groupe ${t.name}` : t.name}</option>)}
              </select>
            </label>
          )}
          {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
        </Sheet>
      )}
    </>
  )
}

// Une personne (ou un groupe) : on la glisse vers un autre groupe de la fiche.
// Glisser au doigt comme à la souris (pointer events) ; la page ne défile pas pendant le glisser.
function PersonChip({ member, draggable, onDrop }: { member: Member; draggable: boolean; onDrop: (group: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)

  return (
    <span
      ref={ref}
      className={`chip inline-flex items-center gap-1.5 select-none ${draggable ? 'cursor-grab touch-none' : ''} ${drag ? 'relative z-10 bg-prune-soft' : ''}`}
      style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}
      onPointerDown={e => {
        if (!draggable) return
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={e => {
        if (!start.current || start.current.id !== e.pointerId) return
        setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
      }}
      onPointerUp={e => {
        if (!start.current) return
        start.current = null
        setDrag(null)
        // Le groupe sous le doigt (la pastille déplacée est ignorée)
        const chip = ref.current
        if (chip) chip.style.pointerEvents = 'none'
        const below = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-group]')
        if (chip) chip.style.pointerEvents = ''
        if (below?.dataset.group) onDrop(below.dataset.group)
      }}
      onPointerCancel={() => { start.current = null; setDrag(null) }}
    >
      <span className="size-6 rounded-full bg-prune-soft text-prune-deep grid place-items-center text-xs font-semibold shrink-0">
        {member.type === 'group' ? <Icon name="users" size={14} /> : member.name.slice(0, 1).toUpperCase()}
      </span>
      {member.name}
    </span>
  )
}
