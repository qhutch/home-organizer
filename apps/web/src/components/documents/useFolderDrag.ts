'use client'

import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

export type DragItem = { kind: 'document' | 'folder'; id: string; name: string }
// target : le dossier sous le pointeur (null = la racine), undefined = rien où le déposer
export type FolderDrag = { item: DragItem; x: number; y: number; target: string | null | undefined }

export type DragHandle = {
  onPointerDown: (e: ReactPointerEvent) => void
  draggable: boolean
  onDragStart: (e: ReactDragEvent) => void
  onContextMenu: (e: ReactMouseEvent) => void
  className: string
}

type Session = { item: DragItem; x0: number; y0: number; x: number; y: number; touch: boolean; active: boolean; timer: number }

// Au doigt : appui long, puis on glisse. À la souris : on glisse tout de suite.
const HOLD_MS = 350
const SLOP = 8

// Glisser un document ou un dossier sur un dossier pour l'y ranger.
// Les endroits où déposer portent data-drop-folder (l'id du dossier, "" pour la racine).
export function useFolderDrag({ enabled, canDrop, onDrop }: {
  enabled: boolean
  canDrop: (item: DragItem, target: string | null) => boolean
  onDrop: (item: DragItem, target: string | null) => void
}) {
  const [drag, setDrag] = useState<FolderDrag | null>(null)
  const session = useRef<Session | null>(null)
  const handlers = useRef({ canDrop, onDrop })
  useEffect(() => { handlers.current = { canDrop, onDrop } })

  function targetAt(item: DragItem, x: number, y: number) {
    const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-folder]')
    if (!zone) return undefined
    const id = zone.dataset.dropFolder || null
    return handlers.current.canDrop(item, id) ? id : undefined
  }

  function show(s: Session) {
    setDrag({ item: s.item, x: s.x, y: s.y, target: targetAt(s.item, s.x, s.y) })
  }

  function end() {
    const s = session.current
    if (s) window.clearTimeout(s.timer)
    session.current = null
    setDrag(null)
  }

  function move(x: number, y: number) {
    const s = session.current
    if (!s) return
    s.x = x
    s.y = y
    if (!s.active) {
      if (Math.hypot(x - s.x0, y - s.y0) < SLOP) return
      // Au doigt, bouger avant l'appui long, c'est faire défiler la page
      if (s.touch) return end()
      s.active = true
    }
    show(s)
  }

  // Rend true si on a vraiment glissé (le clic qui suit ne doit pas ouvrir l'élément)
  function finish(x: number, y: number) {
    const s = session.current
    if (!s) return false
    const wasActive = s.active
    if (wasActive) {
      const target = targetAt(s.item, x, y)
      if (target !== undefined) handlers.current.onDrop(s.item, target)
    }
    end()
    return wasActive
  }

  // Au doigt : écouteurs permanents et non passifs, sinon le navigateur fait défiler la page pendant le glisser
  useEffect(() => {
    const point = (e: TouchEvent) => e.touches[0] ?? e.changedTouches[0]
    function onMove(e: TouchEvent) {
      const s = session.current
      if (!s?.touch) return
      if (s.active) e.preventDefault()
      const p = point(e)
      if (p) move(p.clientX, p.clientY)
    }
    function onEnd(e: TouchEvent) {
      if (!session.current?.touch) return
      const p = point(e)
      if (finish(p?.clientX ?? 0, p?.clientY ?? 0)) e.preventDefault()
    }
    function onCancel() {
      if (session.current?.touch) end()
    }
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: false })
    window.addEventListener('touchcancel', onCancel)
    return () => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onCancel)
    }
  })

  function start(e: ReactPointerEvent, item: DragItem) {
    if (!enabled || e.button !== 0 || session.current) return
    const touch = e.pointerType !== 'mouse'
    const s: Session = { item, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, touch, active: false, timer: 0 }
    session.current = s
    if (touch) {
      s.timer = window.setTimeout(() => {
        if (session.current !== s) return
        s.active = true
        navigator.vibrate?.(10)
        show(s)
      }, HOLD_MS)
      return
    }
    // Souris
    const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY)
    const onUp = (ev: PointerEvent) => {
      cleanup()
      if (finish(ev.clientX, ev.clientY)) {
        const stop = (c: MouseEvent) => { c.preventDefault(); c.stopPropagation() }
        window.addEventListener('click', stop, { capture: true, once: true })
        window.setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
      }
    }
    const onCancel = () => { cleanup(); end() }
    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  // À mettre sur l'élément qu'on peut glisser
  function handle(item: DragItem): DragHandle {
    return {
      onPointerDown: (e: ReactPointerEvent) => start(e, item),
      // Pas de glisser natif du lien ou de l'image, ni de menu de l'appui long
      draggable: false,
      onDragStart: (e: ReactDragEvent) => e.preventDefault(),
      onContextMenu: (e: ReactMouseEvent) => { if (session.current?.touch) e.preventDefault() },
      className: 'select-none [-webkit-touch-callout:none]',
    }
  }

  return { drag, handle }
}
