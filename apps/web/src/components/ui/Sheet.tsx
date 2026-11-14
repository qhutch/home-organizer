'use client'

import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

// Fiche du bas (comme ItemDetailsSheet) : fond page, coins 2rem, toucher à côté ou Échap referme.
// Posée directement dans <body> : rien de la page (fondus de page-wrap compris) ne peut passer par-dessus.
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const titleId = useId()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <h3 id={titleId} className="font-display font-semibold text-2xl tracking-tight flex-1 min-w-0 break-words">{title}</h3>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Fermer">
            <span aria-hidden className="text-2xl leading-none">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  , document.body)
}
