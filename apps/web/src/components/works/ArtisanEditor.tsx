'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteArtisan, updateArtisan, type ArtisanPatch } from '@/app/(app)/works/actions'
import PageHeader from '@/components/ui/PageHeader'
import Icon from '@/components/ui/Icon'
import { Section, TitleField } from '@/components/works/Fields'
import WorkPapers from '@/components/works/WorkPapers'
import { FEATURES } from '@/lib/ui/features'
import { TRADES, formatBudget, formatDay, formatInterventionDay } from '@/lib/works/format'
import { useAutosave } from '@/lib/works/use-autosave'
import type { Artisan, Work, WorkPaper } from '@/types/database'

// Fiche d'un artisan : nom, métier, téléphone, e-mail, notes, et les travaux où il intervient
// (jour d'intervention et devis). Tout s'enregistre au fur et à mesure.
export default function ArtisanEditor({ initialArtisan, works, papers, canUpload }: {
  initialArtisan: Artisan
  works: Work[]
  // Ses devis et factures, et ceux des travaux où il intervient
  papers: WorkPaper[]
  canUpload: boolean
}) {
  const router = useRouter()
  const [artisan, setArtisan] = useState(initialArtisan)
  // Ce qui est tapé dans « Autre métier » : gardé à part pour que la rangée de métiers ne bouge pas
  const [otherTrade, setOtherTrade] = useState(initialArtisan.trade && !TRADES.includes(initialArtisan.trade) ? initialArtisan.trade : '')
  const [busy, setBusy] = useState(false)
  const { queueChange, discard } = useAutosave<ArtisanPatch>(patch => updateArtisan(artisan.id, patch))

  function change(patch: ArtisanPatch, options?: { typing?: boolean }) {
    setArtisan(a => ({ ...a, ...patch }))
    queueChange(patch, options)
  }

  const phone = artisan.phone?.replace(/[^\d+]/g, '') ?? ''
  const email = artisan.email?.trim() ?? ''

  async function remove() {
    if (!window.confirm(`Supprimer « ${artisan.name} » ?`)) return
    setBusy(true)
    await discard()
    await deleteArtisan(artisan.id)
    router.replace('/works/artisans')
  }

  return (
    <div className="page-wrap pb-16">
      <PageHeader feature="works" />

      <TitleField value={artisan.name} onChange={name => change({ name }, { typing: true })} label="Nom de l’artisan" maxLength={80} />

      <Section title="Métier">
        <div className="flex flex-wrap gap-2">
          {TRADES.map(trade => (
            <button
              key={trade}
              type="button"
              onClick={() => {
                setOtherTrade('')
                change({ trade: artisan.trade === trade ? null : trade })
              }}
              className={`chip ${artisan.trade === trade ? 'is-active' : ''}`}
              aria-pressed={artisan.trade === trade}
            >
              {trade}
            </button>
          ))}
        </div>
        <input
          value={otherTrade}
          onChange={e => {
            setOtherTrade(e.target.value)
            change({ trade: e.target.value.trim() || null }, { typing: true })
          }}
          placeholder="Autre métier"
          aria-label="Autre métier"
          maxLength={60}
          className="field mt-2"
        />
      </Section>

      <Section title="Téléphone">
        <div className="flex items-center gap-2">
          <input
            type="tel"
            value={artisan.phone ?? ''}
            onChange={e => change({ phone: e.target.value }, { typing: true })}
            placeholder="06 12 34 56 78"
            aria-label="Téléphone"
            autoComplete="off"
            maxLength={30}
            className="field"
          />
          {phone && (
            <a href={`tel:${phone}`} aria-label={`Appeler ${artisan.name}`} className={`icon-btn-fill shrink-0 ${FEATURES.works.fill}`}>
              <Icon name="phone" />
            </a>
          )}
        </div>
      </Section>

      <Section title="E-mail">
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={artisan.email ?? ''}
            onChange={e => change({ email: e.target.value }, { typing: true })}
            placeholder="contact@artisan.fr"
            aria-label="E-mail"
            autoComplete="off"
            maxLength={120}
            className="field"
          />
          {email.includes('@') && (
            <a href={`mailto:${email}`} aria-label={`Écrire à ${artisan.name}`} className={`icon-btn-fill shrink-0 ${FEATURES.works.fill}`}>
              <Icon name="mail" />
            </a>
          )}
        </div>
      </Section>

      <Section title="Notes">
        <textarea
          value={artisan.notes ?? ''}
          onChange={e => change({ notes: e.target.value }, { typing: true })}
          placeholder="Adresse, horaires, recommandé par…"
          aria-label="Notes"
          rows={3}
          maxLength={4000}
          className="field resize-y"
        />
      </Section>

      <WorkPapers
        papers={papers}
        link={{ workId: null, artisanId: artisan.id }}
        from="artisan"
        workTitles={Object.fromEntries(works.map(w => [w.id, w.title]))}
        canUpload={canUpload}
      />

      {works.length > 0 && (
        <Section title="Travaux" aside={String(works.length)}>
          <ul className="flex flex-col gap-2">
            {works.map(w => {
              const detail = [
                w.status === 'done' && w.doneAt ? `Terminé le ${formatDay(w.doneAt)}` : w.interventionDate ? formatInterventionDay(w.interventionDate) : null,
                w.quote !== null ? `Devis ${formatBudget(w.quote)}` : null,
              ].filter(Boolean).join(' · ')
              return (
                <li key={w.id}>
                  <Link href={`/works/${w.id}`} className={`block rounded-3xl px-5 py-3.5 ${w.status === 'done' ? 'bg-surface hairline' : FEATURES.works.soft}`}>
                    <p className={`font-semibold leading-snug ${w.status === 'done' ? 'text-ink-muted' : ''}`}>{w.title}</p>
                    {detail && <p className="text-xs text-ink-muted mt-0.5">{detail}</p>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      <div className="mt-8 flex justify-end">
        <button type="button" onClick={remove} disabled={busy} className="btn-danger">
          <Icon name="trash" />
          Supprimer l’artisan
        </button>
      </div>
    </div>
  )
}
