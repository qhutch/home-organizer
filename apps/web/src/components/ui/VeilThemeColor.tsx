'use client'

import { useEffect } from 'react'

const PAGE = '#F5EFE7'
const VEILED = '#A5A194' // --color-veiled-page : la page sous un voile bg-ink/40

// La barre d'heure de l'iPhone prend la couleur du thème : on l'assombrit avec la page
// quand un voile (data-veil) est ouvert, comme l'en-tête (voir globals.css).
export default function VeilThemeColor() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    const update = () => {
      const veiled = !!document.querySelector('[data-veil]') && !document.querySelector('[data-screen]')
      const color = veiled ? VEILED : PAGE
      if (meta.content !== color) meta.content = color
    }
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-veil', 'data-screen'] })
    update()
    return () => observer.disconnect()
  }, [])
  return null
}
