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

// « Expiré », « Expire dans 12 jours », « Expire le 3 mars 2027 » ; urgent = à renouveler (60 jours ou moins)
export function expiryLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const now = new Date()
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  if (days < 0) return { text: `Expiré depuis le ${formatDate(date, true)}`, urgent: true }
  if (days === 0) return { text: 'Expire aujourd’hui', urgent: true }
  if (days <= 60) return { text: days === 1 ? 'Expire demain' : `Expire dans ${days} jours`, urgent: true }
  return { text: `Expire le ${formatDate(date, true)}`, urgent: false }
}

// Une ligne de document : aperçu, nom, détail (taille · date, ou son dossier, ou son expiration), qui l'a ajouté.
// En mode choix, le toucher le coche au lieu de l'ouvrir.
export default function DocumentRow({ document, member, detail, selecting, selected, onToggle, onMenu, onOpen }: {
  document: HouseholdDocument
  member?: { name: string; avatarUrl: string | null }
  detail?: 'place' | 'expiry'
  selecting?: boolean
  selected?: boolean
  onToggle?: () => void
  onMenu?: () => void
  onOpen?: () => void
}) {
  const expiry = document.expiresOn ? expiryLabel(document.expiresOn) : null
  const info = detail === 'place'
    ? document.place
    : `${formatSize(document.size)} · ${formatDate(document.createdAt)}`

  const body = (
    <>
      <DocumentThumb document={document} />
      <span className="flex-1 min-w-0">
        <span className="block font-medium truncate">{document.name}</span>
        {detail === 'expiry' && expiry ? (
          <span className={`block text-xs ${expiry.urgent ? 'text-pink-deep font-medium' : 'text-ink-muted'}`}>{expiry.text}</span>
        ) : (
          <>
            <span className="block text-xs text-ink-muted truncate">{info}</span>
            {expiry?.urgent && <span className="block text-xs text-pink-deep font-medium">{expiry.text}</span>}
          </>
        )}
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
