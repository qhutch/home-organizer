'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createArtisan } from '@/app/(app)/works/actions'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import type { Artisan } from '@/types/database'

// Carnet des artisans (dans Travaux) : une carte par artisan, son métier, le nombre de travaux où il intervient,
// et un bouton pour l'appeler. On en ajoute un dans la barre du bas ; sa fiche s'ouvre pour noter son numéro.
export default function ArtisanList({ artisans, workCounts }: { artisans: Artisan[]; workCounts: Record<string, number> }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || busy) return
    setBusy(true)
    const id = await createArtisan(clean)
    if (id) router.push(`/works/artisans/${id}`)
    else setBusy(false)
  }

  return (
    <div className="page-wrap pb-32">
      <PageHeader feature="works" />
      <h2 className="font-display font-semibold text-2xl mb-3">Artisans</h2>

      {artisans.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-2 text-center">
          <span className={FEATURES.works.text}><Icon name="helmet" size={32} /></span>
          <p className="font-semibold">Aucun artisan noté</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {artisans.map(a => {
            const count = workCounts[a.id] ?? 0
            const detail = [a.trade, count ? `${count} ${count > 1 ? 'travaux' : 'travail'}` : null].filter(Boolean).join(' · ')
            return (
              <li key={a.id} className={`rounded-3xl flex items-center gap-2 pl-5 pr-1.5 ${FEATURES.works.soft}`}>
                <Link href={`/works/artisans/${a.id}`} className="flex-1 min-w-0 py-3.5">
                  <p className="font-semibold leading-snug truncate">{a.name}</p>
                  {detail && <p className="text-xs text-ink-muted mt-0.5 truncate">{detail}</p>}
                </Link>
                {a.phone && (
                  <a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`} aria-label={`Appeler ${a.name}`} className={`icon-btn-fill ${FEATURES.works.fill}`}>
                    <Icon name="phone" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ActionBar>
        <form onSubmit={add} className="flex items-center gap-1 w-full min-w-0 min-h-11">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nouvel artisan…"
            aria-label="Nouvel artisan"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={80}
            className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint"
          />
          {name.trim() && (
            <button type="submit" disabled={busy} aria-label="Ajouter l’artisan" className={`icon-btn-fill ${FEATURES.works.fill}`}>
              <Icon name="plus" />
            </button>
          )}
        </form>
      </ActionBar>
    </div>
  )
}
