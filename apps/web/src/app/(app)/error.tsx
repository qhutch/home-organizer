'use client'

import { useRouter } from 'next/navigation'
import { startTransition } from 'react'
import SavedShoppingList from '@/components/shopping/SavedShoppingList'

// Une page qui n'a pas pu se charger (ex. base de données indisponible) : réessayer,
// et en attendant la liste de courses gardée sur le téléphone.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  function retry() {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }
  return (
    <div className="page-wrap">
      <div className="card">
        <h1 className="font-display font-semibold text-xl tracking-tight">Hestia ne répond pas</h1>
        <button type="button" onClick={retry} className="btn mt-4">Réessayer</button>
      </div>
      <SavedShoppingList />
    </div>
  )
}
