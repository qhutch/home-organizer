'use client'

import { useState } from 'react'
import Sheet from '@/components/ui/Sheet'
import { FEATURES } from '@/lib/ui/features'
import PrivacyChips from '@/components/documents/PrivacyChips'

// Fiche pour nommer un nouveau dossier ; shareLabel : propose aussi « Moi seulement » ou « Moi et Quentin »
export default function NameSheet({ title, initial = '', submitLabel, shareLabel = null, onSubmit, onClose }: {
  title: string
  initial?: string
  submitLabel: string
  shareLabel?: string | null
  // Rend un message d'erreur, ou null si c'est bon (la fiche se ferme)
  onSubmit: (name: string, isPrivate: boolean) => Promise<string | null>
  onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const err = await onSubmit(name, isPrivate)
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
        {shareLabel && <PrivacyChips value={isPrivate} shareLabel={shareLabel} onChange={setIsPrivate} />}
        {error && <p role="alert" className="text-sm text-pink-deep">{error}</p>}
        <button type="submit" disabled={busy || !name.trim()} className={`btn-feature ${FEATURES.documents.fill}`}>{submitLabel}</button>
      </form>
    </Sheet>
  )
}
