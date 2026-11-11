'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createArtisan, deleteWork, updateWork, type WorkMember, type WorkPatch } from '@/app/(app)/works/actions'
import { addIngredientsToShopping } from '@/app/(app)/actions'
import PageHeader from '@/components/ui/PageHeader'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import Checklist from '@/components/works/Checklist'
import WorkPapers from '@/components/works/WorkPapers'
import { MoneyField, Section, TitleField } from '@/components/works/Fields'
import { FEATURES } from '@/lib/ui/features'
import { COMMON_ROOMS, WORK_STATUSES, formatDay } from '@/lib/works/format'
import { useAutosave } from '@/lib/works/use-autosave'
import type { Artisan, Work, WorkPaper } from '@/types/database'

// Fiche d'un travail. Tout s'enregistre au fur et à mesure : les choix tout de suite,
// le texte après une courte pause ou en quittant la page.
export default function WorkEditor({ initialWork, members, rooms, initialArtisans, papers, canUpload }: {
  initialWork: Work
  // Devis et factures reliés (rangés dans Documents)
  papers: WorkPaper[]
  canUpload: boolean
  members: WorkMember[]
  // Pièces déjà notées sur les autres travaux
  rooms: string[]
  initialArtisans: Artisan[]
}) {
  const router = useRouter()
  const [work, setWork] = useState(initialWork)
  const [artisans, setArtisans] = useState(initialArtisans)
  const [newArtisan, setNewArtisan] = useState('')
  const roomChoices = [...new Set([...COMMON_ROOMS, ...rooms])]
  // Ce qui est tapé dans « Autre pièce » : gardé à part pour que la rangée de pièces ne bouge pas pendant la saisie
  const [otherRoom, setOtherRoom] = useState(initialWork.room && !roomChoices.includes(initialWork.room) ? initialWork.room : '')
  const [sent, setSent] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const { queueChange, flush, discard } = useAutosave<WorkPatch>(patch => updateWork(work.id, patch))

  function change(patch: WorkPatch, options?: { typing?: boolean }) {
    setWork(w => ({ ...w, ...patch, ...(patch.status ? { doneAt: patch.status === 'done' ? new Date().toISOString() : null } : {}) }))
    queueChange(patch, options)
  }

  const toBuy = work.supplies.filter(s => !s.done && s.text.trim())
  const artisan = artisans.find(a => a.id === work.artisanId) ?? null

  async function sendToShopping() {
    setBusy(true)
    await addIngredientsToShopping(toBuy.map(s => ({ name: s.text, quantity: null, unit: null })))
    setSent(toBuy.length)
    setBusy(false)
  }

  async function addArtisan(e: React.FormEvent) {
    e.preventDefault()
    const name = newArtisan.trim()
    if (!name || busy) return
    setBusy(true)
    await flush()
    const id = await createArtisan(name, work.id)
    setBusy(false)
    if (!id) return
    setArtisans(list => [...list, { id, name, trade: null, phone: null, email: null, notes: null, addedBy: '', createdAt: '' }]
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')))
    setWork(w => ({ ...w, artisanId: id }))
    setNewArtisan('')
  }

  async function remove() {
    if (!window.confirm(`Supprimer « ${work.title} » ?`)) return
    setBusy(true)
    await discard()
    await deleteWork(work.id)
    router.replace('/works')
  }

  return (
    <div className="page-wrap pb-16">
      <PageHeader feature="works" />

      <TitleField value={work.title} onChange={title => change({ title }, { typing: true })} label="Nom du travail" maxLength={120} />

      <div className="flex flex-wrap gap-2 mb-2">
        {WORK_STATUSES.map(s => (
          <button key={s.id} type="button" onClick={() => change({ status: s.id })} className={`chip ${work.status === s.id ? 'is-active' : ''}`}>
            {s.label}
          </button>
        ))}
      </div>
      {work.status === 'done' && work.doneAt && (
        <p className="text-sm text-ink-muted">Terminé le {formatDay(work.doneAt)}</p>
      )}

      <Section title="Qui s’en occupe">
        <div className="flex flex-wrap gap-2">
          {members.map(m => {
            const active = work.assignees.includes(m.uid)
            return (
              <button
                key={m.uid}
                type="button"
                onClick={() => change({ assignees: active ? work.assignees.filter(u => u !== m.uid) : [...work.assignees, m.uid] })}
                className={`chip flex items-center gap-1.5 !pl-1.5 ${active ? 'is-active' : ''}`}
                aria-pressed={active}
              >
                <Avatar name={m.name} url={m.avatarUrl} size={22} />
                {m.name}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Artisan">
        {artisans.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {artisans.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => change({ artisanId: work.artisanId === a.id ? null : a.id })}
                className={`chip ${work.artisanId === a.id ? 'is-active' : ''}`}
                aria-pressed={work.artisanId === a.id}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={addArtisan} className="bg-surface hairline rounded-full flex items-center gap-1 p-1">
          <input
            value={newArtisan}
            onChange={e => setNewArtisan(e.target.value)}
            placeholder="Nouvel artisan"
            aria-label="Nouvel artisan"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={80}
            className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint"
          />
          {newArtisan.trim() && (
            <button type="submit" disabled={busy} aria-label="Ajouter l’artisan" className={`icon-btn-fill ${FEATURES.works.fill}`}>
              <Icon name="plus" />
            </button>
          )}
        </form>

        {artisan && (
          <>
            <div className={`mt-3 rounded-3xl flex items-center gap-2 pl-5 pr-1.5 py-1.5 ${FEATURES.works.soft}`}>
              <Link href={`/works/artisans/${artisan.id}`} className="flex-1 min-w-0 py-1.5">
                <p className="font-semibold truncate">{artisan.name}</p>
                {artisan.trade && <p className="text-xs text-ink-muted truncate">{artisan.trade}</p>}
              </Link>
              {artisan.phone && (
                <a href={`tel:${artisan.phone.replace(/[^\d+]/g, '')}`} aria-label={`Appeler ${artisan.name}`} className={`icon-btn-fill ${FEATURES.works.fill}`}>
                  <Icon name="phone" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="flex flex-col gap-1">
                <span className="eyebrow">Intervention</span>
                <input
                  type="date"
                  value={work.interventionDate ?? ''}
                  onChange={e => change({ interventionDate: e.target.value || null })}
                  className="field min-h-12"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="eyebrow">Devis</span>
                <MoneyField value={work.quote} onChange={quote => change({ quote }, { typing: true })} label="Montant du devis en euros" />
              </label>
            </div>
          </>
        )}
      </Section>

      <WorkPapers papers={papers} link={{ workId: work.id, artisanId: work.artisanId }} from="work" canUpload={canUpload} />

      <Section title="Pièce">
        <div className="flex flex-wrap gap-2">
          {roomChoices.map(room => (
            <button
              key={room}
              type="button"
              onClick={() => {
                setOtherRoom('')
                change({ room: work.room === room ? null : room })
              }}
              className={`chip ${work.room === room ? 'is-active' : ''}`}
              aria-pressed={work.room === room}
            >
              {room}
            </button>
          ))}
        </div>
        <input
          value={otherRoom}
          onChange={e => {
            setOtherRoom(e.target.value)
            change({ room: e.target.value.trim() || null }, { typing: true })
          }}
          placeholder="Autre pièce ou endroit"
          aria-label="Autre pièce ou endroit"
          maxLength={60}
          className="field mt-2"
        />
      </Section>

      <Section title="Étapes" aside={work.steps.length > 0 ? `${work.steps.filter(s => s.done).length}/${work.steps.length}` : undefined}>
        <Checklist
          items={work.steps}
          onChange={(steps, options) => change({ steps }, options)}
          placeholder="Poncer, peindre…"
          addLabel="Ajouter une étape"
        />
      </Section>

      <Section title="Matériel à acheter">
        <Checklist
          items={work.supplies}
          onChange={(supplies, options) => {
            setSent(null)
            change({ supplies }, options)
          }}
          placeholder="Pot de peinture, rouleau…"
          addLabel="Ajouter du matériel"
        />
        {sent !== null ? (
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-sm font-semibold text-pistachio-deep flex items-center gap-1.5">
              <Icon name="check" size={20} />
              C’est dans la liste de courses
            </p>
            <Link href="/shopping" className={`btn-feature ${FEATURES.shopping.fill}`}>
              <Icon name="shopping" />
              Voir la liste
            </Link>
          </div>
        ) : toBuy.length > 0 && (
          <button type="button" onClick={sendToShopping} disabled={busy} className={`btn-feature-outline w-full mt-3 ${FEATURES.works.text}`}>
            <Icon name="shopping" />
            {toBuy.length === 1 ? 'Ajouter 1 article aux courses' : `Ajouter ${toBuy.length} articles aux courses`}
          </button>
        )}
      </Section>

      <Section title="Budget">
        <MoneyField value={work.budget} onChange={budget => change({ budget }, { typing: true })} label="Budget en euros" />
      </Section>

      <Section title="Notes">
        <textarea
          value={work.notes ?? ''}
          onChange={e => change({ notes: e.target.value }, { typing: true })}
          placeholder="Références, mesures, idées…"
          aria-label="Notes"
          rows={4}
          maxLength={4000}
          className="field resize-y"
        />
      </Section>

      <div className="mt-8 flex justify-end">
        <button type="button" onClick={remove} disabled={busy} className="btn-danger">
          <Icon name="trash" />
          Supprimer le travail
        </button>
      </div>
    </div>
  )
}
