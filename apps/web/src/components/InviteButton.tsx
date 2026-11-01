'use client'

import { useState } from 'react'
import { generateInviteLink } from '@/app/(app)/household/actions'

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
        className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
      >
        + Inviter
      </button>

      {open && link && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-zinc-700 rounded-t-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-1">Lien d&apos;invitation</h3>
            <p className="text-xs text-zinc-400 mb-4">Valable 7 jours</p>
            <div className="bg-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 break-all mb-3">{link}</div>
            <button
              onClick={copy}
              className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-medium hover:bg-white transition-colors"
            >
              {copied ? '✓ Copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
