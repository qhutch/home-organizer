'use client'

import { useEffect, useRef } from 'react'

// Barre du bas d'un onglet : elle réunit ses actions (recherche, ajout, affichage…).
// Elle remonte au-dessus du clavier sur téléphone.
// `detached` : des actions sans lien entre elles, posées séparément (voir barGroup).
export default function ActionBar({ children, detached = false }: { children: React.ReactNode; detached?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    function place() {
      if (!ref.current || !viewport) return
      const hidden = window.innerHeight - viewport.height - viewport.offsetTop
      ref.current.style.bottom = `${Math.max(0, hidden)}px`
    }
    viewport.addEventListener('resize', place)
    viewport.addEventListener('scroll', place)
    return () => {
      viewport.removeEventListener('resize', place)
      viewport.removeEventListener('scroll', place)
    }
  }, [])

  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className={detached ? 'flex items-center justify-between gap-2 w-full max-w-lg' : `${barGroup} w-full max-w-lg`}>
        {children}
      </div>
    </div>
  )
}

// Pilule de la barre, qui réunit des actions liées
export const barGroup = 'pointer-events-auto bg-surface hairline rounded-full p-1.5 flex items-center gap-1'

// Boutons ronds de la barre : utilitaires icon-btn / icon-btn-fill (globals.css)
