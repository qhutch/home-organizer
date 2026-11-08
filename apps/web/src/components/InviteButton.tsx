'use client'

import { useState } from 'react'
import { generateInviteLink } from '@/app/(app)/settings/actions'

export default function InviteButton({ householdId }: { householdId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    const token = await generateInviteLink(householdId)
    if (token) {
      const url = `${window.location.origin}/setup/invite/${token}`
      setLink(url)
      setOpen(true)
    }
    setLoading(false)
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="pill text-ink hover:bg-coconut disabled:opacity-50"
      >
        + Inviter
      </button>

      {open && link && (
        <div className="fixed inset-0 bg-ink/40 flex items-end justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-page rounded-t-[2rem] p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-2xl tracking-tight mb-1">Lien d&apos;invitation</h3>
            <p className="text-xs text-ink-muted mb-4">Valable 7 jours</p>
            <div className="card text-xs break-all mb-3">{link}</div>
            <button
              onClick={copy}
              className="btn w-full"
            >
              {copied ? '✓ Copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
