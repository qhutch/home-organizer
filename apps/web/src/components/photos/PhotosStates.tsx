import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'

// Pas encore de NAS branché pour ce foyer
export function NoNas() {
  return (
    <div className="card py-10 flex flex-col items-center gap-3 text-center">
      <span className="icon-btn bg-prune-soft text-prune-deep" aria-hidden><Icon name="server" /></span>
      <p className="font-semibold">Aucun NAS branché</p>
      <Link href="/settings#nas" className={`btn-feature ${FEATURES.photos.fill}`}>Brancher un NAS</Link>
    </div>
  )
}

// Le NAS ne répond pas (éteint, tunnel coupé…) ou refuse
export function NasDown({ message }: { message: string }) {
  return (
    <div className="card py-10 flex flex-col items-center gap-2 text-center">
      <span className="icon-btn bg-prune-soft text-prune-deep" aria-hidden><Icon name="server" /></span>
      <p className="font-semibold">NAS injoignable</p>
      <p className="text-sm text-ink-muted">{message}</p>
      <Link href="/settings#nas" className={`btn-feature-outline ${FEATURES.photos.text} mt-1`}>Réglages</Link>
    </div>
  )
}
