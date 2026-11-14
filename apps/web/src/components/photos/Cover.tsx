'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'

// Couverture d'un album : si le NAS refuse la miniature (photo d'un compte supprimé…), l'icône reste
export default function Cover({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="relative block aspect-square rounded-3xl overflow-hidden bg-prune-soft text-prune-deep">
      <span className="absolute inset-0 grid place-items-center"><Icon name="photos" size={40} /></span>
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- miniature servie par notre route
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
      )}
    </span>
  )
}
