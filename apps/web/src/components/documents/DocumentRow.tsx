'use client'

import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import DocumentThumb from '@/components/documents/DocumentThumb'
import { FEATURES } from '@/lib/ui/features'
import { formatSize } from '@/lib/documents/limits'
import type { HouseholdDocument } from '@/types/database'

export function formatDate(iso: string, withYear = false) {
  if (!iso) return ''
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(sameYear && !withYear ? {} : { year: 'numeric' }) })
}

// Une ligne de document : aperçu, nom, détail (taille · date, ou son dossier), qui l'a ajouté.
// En mode choix, le toucher le coche au lieu de l'ouvrir.
export default function DocumentRow({ document, member, detail, selecting, selected, onToggle, onMenu, onOpen }: {
  document: HouseholdDocument
  member?: { name: string; avatarUrl: string | null }
  detail?: 'place'
  selecting?: boolean
  selected?: boolean
  onToggle?: () => void
  onMenu?: () => void
  onOpen?: () => void
}) {
  const info = detail === 'place'
    ? document.place
    : `${formatSize(document.size)} · ${formatDate(document.createdAt)}`

  const body = (
    <>
      <DocumentThumb document={document} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 font-medium min-w-0">
          <span className="truncate">{document.name}</span>
          {document.privateTo && <><Icon name="lock" size={16} className="shrink-0 text-ink-muted" /><span className="sr-only">, privé</span></>}
        </span>
        <span className="block text-xs text-ink-muted truncate">{info}</span>
      </span>
      {member && !selecting && <Avatar name={member.name} url={member.avatarUrl} size={28} />}
    </>
  )

  const rowClass = 'flex-1 min-w-0 flex items-center gap-3 p-2.5 rounded-2xl hover:bg-coconut transition-colors text-left'

  return (
    <li className="flex items-center gap-1">
      {selecting ? (
        <button type="button" onClick={onToggle} aria-pressed={selected} className={rowClass}>
          <span className={`check-btn -my-2 -ml-1 ${selected ? 'is-done' : ''} ${FEATURES.documents.text}`} aria-hidden>
            <span><Icon name="check" /></span>
          </span>
          {body}
        </button>
      ) : (
        <Link href={document.href} onClick={onOpen} className={rowClass}>{body}</Link>
      )}
      {onMenu && !selecting && (
        <button type="button" onClick={onMenu} className="icon-btn mr-1" aria-label={`Ranger, renommer ou supprimer ${document.name}`}>
          <Icon name="dots" size={20} />
        </button>
      )}
    </li>
  )
}
