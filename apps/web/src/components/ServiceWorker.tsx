'use client'

import { useEffect } from 'react'

// Installe public/sw.js (page hors connexion avec la liste de courses). Pas en dev : il gênerait le rechargement.
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
