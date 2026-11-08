'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from '@/components/ui/Icon'

// Le logo Hestia ramène à l'accueil depuis toutes les pages. Le lien Réglages reste sur l'accueil.
export default function AppHeader() {
  const pathname = usePathname()
  return (
    <header className="flex items-center justify-between gap-4 px-4 pt-5">
      <Link href="/" className="font-display font-semibold text-2xl tracking-tight hover:opacity-70 transition-opacity">
        Hestia
      </Link>
      {pathname === '/' && (
        <nav className="flex items-center gap-2" aria-label="Compte">
          <Link href="/settings" aria-label="Réglages" title="Réglages" className="pill text-ink hover:bg-coconut">
            <Icon name="settings" size={20} />
          </Link>
        </nav>
      )}
    </header>
  )
}
