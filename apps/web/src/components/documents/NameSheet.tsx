'use client'

import { useState } from 'react'
import Sheet from '@/components/ui/Sheet'
import { FEATURES } from '@/lib/ui/features'

// Fiche pour nommer un dossier (nouveau ou à renommer)
export default function NameSheet({ title, initial = '', submitLabel, onSubmit, onClose }: {
  title: string
  initial?: string
  submitLabel: string
  // Rend un message d'erreur, ou null si c'est bon (la fiche se ferme)
  onSubmit: (name: string) => Promise<string | null>
  onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const err = await onSubmit(name)
    setBusy(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Impôts, Maison, Santé…"
          maxLength={80}
          autoFocus
          required
          className="field"
        />
        {error && <p role="alert" className="text-sm text-pink-deep">{error}</p>}
        <button type="submit" disabled={busy || !name.trim()} className={`btn-feature ${FEATURES.documents.fill}`}>{submitLabel}</button>
      </form>
    </Sheet>
  )
}
