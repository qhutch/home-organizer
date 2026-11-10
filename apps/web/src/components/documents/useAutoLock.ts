'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Reverrouillage : sans action pendant `minutes`, on redemande la page au serveur, qui décide.
// Rend `touch` (à appeler à chaque action) et `outcome` (lit le résultat d'une action : reverrouillé → recharge).
export function useAutoLock(minutes: number) {
  const router = useRouter()
  const [activity, setActivity] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => router.refresh(), minutes * 60 * 1000 + 1000)
    return () => clearTimeout(timer)
  }, [activity, minutes, router])

  const touch = useCallback(() => setActivity(n => n + 1), [])

  const outcome = useCallback((res: { ok: true } | { ok: false; error: string }) => {
    setActivity(n => n + 1)
    if (res.ok) return null
    if (res.error === 'locked') router.refresh()
    return res.error
  }, [router])

  return { touch, outcome }
}
