'use client'

import { useEffect } from 'react'
import Emoji from '@/components/ui/Emoji'

export const UNDO_MS = 5000

// Message du bas, juste au-dessus de la barre, pour annuler ce qu'on vient de faire (« Lait acheté · Annuler »).
// Il reste UNDO_MS (la fine barre se vide), puis onDone. `id` change à chaque nouveau message : le décompte repart.
export default function UndoToast({ id, emoji, text, onUndo, onDone, accent }: {
  id: string
  emoji?: string
  text: string
  onUndo: () => void
  onDone: () => void
  // Couleur de « Annuler » et de la barre : celle de la fonctionnalité (texte et fond)
  accent: { text: string; fill: string }
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, UNDO_MS)
    return () => clearTimeout(timer)
  }, [id, onDone])

  return (
    <div className="fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-40 flex justify-center px-4 pointer-events-none">
      <div key={id} role="status" className="toast-in pointer-events-auto relative overflow-hidden w-full max-w-lg bg-ink text-page rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-2">
        {emoji && <Emoji name={emoji} size={24} />}
        <span className="flex-1 min-w-0 truncate text-sm font-semibold">{text}</span>
        <button type="button" onClick={onUndo} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold hover:bg-page/10 ${accent.text}`}>
          Annuler
        </button>
        <span aria-hidden className={`toast-countdown absolute left-0 bottom-0 h-[3px] w-full ${accent.fill}`} style={{ animationDuration: `${UNDO_MS}ms` }} />
      </div>
    </div>
  )
}
