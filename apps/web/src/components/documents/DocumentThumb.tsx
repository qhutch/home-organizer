import Icon, { type IconName } from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import type { HouseholdDocument } from '@/types/database'

export function iconFor(mimeType: string): IconName {
  if (mimeType === 'application/pdf') return 'filePdf'
  if (mimeType.startsWith('image/')) return 'photos'
  return 'file'
}

// Aperçu carré d'un document (sa miniature, ou l'icône de son type sur fond moutarde doux)
export default function DocumentThumb({ document, size = 48, className = '' }: {
  document: Pick<HouseholdDocument, 'id' | 'mimeType' | 'hasThumb'>
  size?: number
  className?: string
}) {
  const style = { width: size, height: size }
  if (document.hasThumb) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- petite image servie par notre route, derrière Face ID
      <img src={`/api/documents/${document.id}/thumb`} alt="" style={style} className={`rounded-2xl object-cover object-top shrink-0 bg-surface hairline ${className}`} />
    )
  }
  return (
    <span style={style} className={`rounded-2xl flex items-center justify-center shrink-0 ${FEATURES.documents.soft} ${className}`}>
      <Icon name={iconFor(document.mimeType)} className={FEATURES.documents.text} />
    </span>
  )
}
