'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { markBack } from '@/lib/ui/back-nav'

type Back = { href: string; label: string }

// Où mène le bouton retour depuis chaque page. Rien sur l'accueil ni pendant la création du foyer.
// L'app s'installe en plein écran, sans bouton retour du navigateur : chaque page doit avoir le sien.
function backFor(pathname: string): Back | null {
  if (pathname === '/' || pathname.startsWith('/setup')) return null
  const courses = pathname.match(/^\/recipes\/([^/]+)\/(courses|cuisiner|modifier|photo\/[^/]+)$/)
  if (courses) return { href: `/recipes/${courses[1]}`, label: 'La recette' }
  if (pathname.startsWith('/recipes/')) return { href: '/recipes', label: 'Recettes' }
  if (pathname.startsWith('/works/artisans/')) return { href: '/works/artisans', label: 'Artisans' }
  if (pathname.startsWith('/works/')) return { href: '/works', label: 'Travaux' }
  // Dossiers de documents : /documents/{id}/{id}… — on remonte d'un dossier
  const folder = pathname.match(/^(\/documents(?:\/[^/]+)*)\/[^/]+$/)
  if (folder) return { href: folder[1], label: folder[1] === '/documents' ? 'Documents' : 'Dossier parent' }
  if (pathname === '/calendar/pick') return { href: '/settings', label: 'Réglages' }
  return { href: '/', label: 'Accueil' }
}

// Distance (px) depuis le bord gauche où le geste peut commencer, et longueur du glissé qui déclenche le retour.
const EDGE = 24
const TRIGGER = 80

// Glisser le doigt depuis le bord gauche ramène à la page parente, comme dans les apps iPhone.
// Seulement dans l'app installée : dans Safari, le navigateur fait déjà ce geste.
function useEdgeSwipeBack(href: string | null) {
  const router = useRouter()
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!href) return
    const installed = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!installed) return

    function onStart(e: TouchEvent) {
      const t = e.touches[0]
      start.current = e.touches.length === 1 && t.clientX <= EDGE ? { x: t.clientX, y: t.clientY } : null
    }
    function onMove(e: TouchEvent) {
      if (!start.current) return
      const t = e.touches[0]
      const dx = t.clientX - start.current.x
      const dy = Math.abs(t.clientY - start.current.y)
      // Un geste plutôt vertical, c'est un défilement : on laisse faire.
      if (dy > Math.max(30, dx)) { start.current = null; setDrag(0); return }
      setDrag(Math.max(0, dx))
    }
    function onEnd(e: TouchEvent) {
      if (!start.current) return
      const dx = e.changedTouches[0].clientX - start.current.x
      start.current = null
      setDrag(0)
      if (dx >= TRIGGER && href) { markBack(href); router.push(href) }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [href, router])

  return drag
}

// En-tête de toutes les pages : le logo Hestia centré (ramène à l'accueil), le bouton retour à gauche
// (sauf sur l'accueil), la roue des Réglages à droite partout (sauf dans les Réglages et pendant la création du foyer).
// Le bouton retour est ici (et pas dans chaque page) pour être là dès l'écran de chargement.
export default function AppHeader() {
  const pathname = usePathname()
  const back = backFor(pathname)
  const feature = Object.values(FEATURES).find(f => pathname === f.href || pathname.startsWith(`${f.href}/`))
  const backColor = feature ? feature.text : 'text-ink'
  const drag = useEdgeSwipeBack(back?.href ?? null)
  const progress = Math.min(1, drag / TRIGGER)

  // Retour du navigateur (Safari) : la page d'arrivée sait qu'on revient
  useEffect(() => {
    const onPop = () => markBack(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    // app-header : dans l'app installée, l'en-tête reste collé en haut pour qu'iOS ne le floute pas (voir globals.css)
    <header className="app-header grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 pt-5">
      <div>
        {back && (
          <Link href={back.href} onClick={() => markBack(back.href)} aria-label={`Retour : ${back.label}`} title={back.label} className={`pill hover:bg-coconut ${backColor}`}>
            <Icon name="arrowLeft" size={20} />
          </Link>
        )}
      </div>
      <Link href="/" className="font-display font-semibold text-2xl tracking-tight hover:opacity-70 transition-opacity">
        Hestia
      </Link>
      <div className="flex justify-end">
        {!pathname.startsWith('/settings') && !pathname.startsWith('/setup') && (
          <nav aria-label="Compte">
            <Link href="/settings" aria-label="Réglages" title="Réglages" className="pill text-ink hover:bg-coconut">
              <Icon name="settings" size={20} />
            </Link>
          </nav>
        )}
      </div>

      {/* Pendant le glissé depuis le bord : une flèche arrive de la gauche, pleine quand on peut lâcher */}
      {drag > 0 && (
        <div
          aria-hidden="true"
          className={`fixed left-0 top-1/2 z-50 -mt-6 w-12 h-12 rounded-full flex items-center justify-center pointer-events-none transition-colors ${progress === 1 ? 'bg-ink text-surface' : `bg-surface hairline ${backColor}`}`}
          style={{ transform: `translateX(${-48 + progress * 64}px)` }}
        >
          <Icon name="arrowLeft" size={22} />
        </div>
      )}
    </header>
  )
}
