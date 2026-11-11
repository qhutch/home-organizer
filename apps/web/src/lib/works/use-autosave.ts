'use client'

import { useEffect, useRef } from 'react'

// Délai avant d'enregistrer ce qui est tapé au clavier
const TYPING_DELAY_MS = 700

// Enregistrement au fur et à mesure d'une fiche : les choix tout de suite, le texte après une
// courte pause ou en quittant la page. Les envois partent l'un après l'autre, dans l'ordre.
export function useAutosave<P extends object>(save: (patch: P) => Promise<unknown>) {
  const unsaved = useRef<Partial<P>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  function flush() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const patch = unsaved.current
    unsaved.current = {}
    if (Object.keys(patch).length) {
      queue.current = queue.current.then(() => saveRef.current(patch as P)).catch(() => undefined)
    }
    return queue.current
  }

  // Oublie ce qui n'est pas encore parti (avant une suppression) et attend la fin des envois
  function discard() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    unsaved.current = {}
    return queue.current
  }

  function queueChange(patch: Partial<P>, { typing = false } = {}) {
    unsaved.current = { ...unsaved.current, ...patch }
    if (timer.current) clearTimeout(timer.current)
    if (typing) timer.current = setTimeout(flush, TYPING_DELAY_MS)
    else flush()
  }

  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  })
  useEffect(() => {
    const onHide = () => flushRef.current()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      flushRef.current()
    }
  }, [])

  return { queueChange, flush, discard }
}
