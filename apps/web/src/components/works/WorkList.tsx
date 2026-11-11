'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { createWork, updateWork, type WorkMember } from '@/app/(app)/works/actions'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar from '@/components/ui/ActionBar'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import CheckButton from '@/components/works/CheckButton'
import { FEATURES } from '@/lib/ui/features'
import { formatDay, workDetail } from '@/lib/works/format'
import type { Artisan, Work, WorkStatus } from '@/types/database'

// Page Travaux : en cours, à faire, puis l'historique des travaux terminés.
// On note un travail dans la barre du bas ; la case ronde le passe à « Terminé » ; la carte ouvre sa fiche.
export default function WorkList({ initialWorks, members, artisans }: { initialWorks: Work[]; members: WorkMember[]; artisans: Artisan[] }) {
  const [works, setWorks] = useState(initialWorks)
  const [title, setTitle] = useState('')
  // Membre choisi dans le filtre « qui s'en occupe » ; null = tout le monde
  const [who, setWho] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const shown = who ? works.filter(w => w.assignees.includes(who)) : works
  const doing = shown.filter(w => w.status === 'doing')
  const todo = shown.filter(w => w.status === 'todo')
  const done = shown
    .filter(w => w.status === 'done')
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  function add(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    const now = new Date().toISOString()
    const tempId = `temp-${Date.now()}`
    const work: Work = {
      id: tempId, title: clean, status: 'todo', room: null, assignees: who ? [who] : [], steps: [], supplies: [],
      budget: null, notes: null, artisanId: null, interventionDate: null, quote: null, doneAt: null, addedBy: '', createdAt: now, updatedAt: now,
    }
    setWorks(list => [work, ...list])
    setTitle('')
    startTransition(async () => {
      const id = await createWork(clean, work.assignees)
      if (id) setWorks(list => list.map(w => (w.id === tempId ? { ...w, id } : w)))
    })
  }

  function toggle(work: Work) {
    const status: WorkStatus = work.status === 'done' ? 'todo' : 'done'
    setWorks(list => list.map(w => (w.id === work.id ? { ...w, status, doneAt: status === 'done' ? new Date().toISOString() : null } : w)))
    startTransition(() => updateWork(work.id, { status }))
  }

  const empty = !doing.length && !todo.length && !done.length

  return (
    <div className="page-wrap pb-32">
      <PageHeader
        feature="works"
        aside={
          <Link href="/works/artisans" className={`pill gap-1.5 hover:bg-coconut ${FEATURES.works.text}`}>
            <Icon name="helmet" size={20} />
            Artisans
          </Link>
        }
      />

      {members.length > 1 && (
        <div className="-mx-4 px-4 mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          <button type="button" onClick={() => setWho(null)} className={`chip shrink-0 ${who === null ? 'is-active' : ''}`}>
            Tout le monde
          </button>
          {members.map(m => (
            <button
              key={m.uid}
              type="button"
              onClick={() => setWho(current => (current === m.uid ? null : m.uid))}
              className={`chip shrink-0 flex items-center gap-1.5 !pl-1.5 ${who === m.uid ? 'is-active' : ''}`}
            >
              <Avatar name={m.name} url={m.avatarUrl} size={22} />
              {m.name}
            </button>
          ))}
        </div>
      )}

      {empty && (
        <div className="card py-12 flex flex-col items-center gap-2 text-center">
          <span className={FEATURES.works.text}><Icon name="works" size={32} /></span>
          <p className="font-semibold">{who ? 'Rien de prévu pour l’instant' : 'Aucun travail noté'}</p>
        </div>
      )}

      <WorkSection title="En cours" works={doing} members={members} artisans={artisans} onToggle={toggle} />
      <WorkSection title="À faire" works={todo} members={members} artisans={artisans} onToggle={toggle} />
      <WorkSection title="Terminés" works={done} members={members} artisans={artisans} onToggle={toggle} />

      <ActionBar>
        <form onSubmit={add} className="flex items-center gap-1 w-full min-w-0 min-h-11">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Nouveau travail…"
            aria-label="Nouveau travail"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={120}
            className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint"
          />
          {title.trim() && (
            <button type="submit" aria-label="Ajouter le travail" className={`icon-btn-fill ${FEATURES.works.fill}`}>
              <Icon name="plus" />
            </button>
          )}
        </form>
      </ActionBar>
    </div>
  )
}

function WorkSection({ title, works, members, artisans, onToggle }: {
  title: string
  works: Work[]
  members: WorkMember[]
  artisans: Artisan[]
  onToggle: (work: Work) => void
}) {
  if (!works.length) return null
  return (
    <section className="mb-6">
      <h2 className="font-display font-semibold text-lg mb-2 flex items-baseline gap-2">
        {title}
        <span className="text-sm font-sans font-medium text-ink-muted">{works.length}</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {works.map(work => (
          <WorkCard key={work.id} work={work} members={members} artisanName={artisans.find(a => a.id === work.artisanId)?.name} onToggle={() => onToggle(work)} />
        ))}
      </ul>
    </section>
  )
}

function WorkCard({ work, members, artisanName, onToggle }: { work: Work; members: WorkMember[]; artisanName?: string; onToggle: () => void }) {
  const done = work.status === 'done'
  const detail = done && work.doneAt ? `Terminé le ${formatDay(work.doneAt)}` : workDetail(work, artisanName)
  const people = work.assignees.map(uid => members.find(m => m.uid === uid)).filter((m): m is WorkMember => !!m)
  const pending = work.id.startsWith('temp-')

  return (
    <li className={`rounded-3xl flex items-center gap-1 pl-1.5 pr-4 ${done ? 'bg-surface hairline' : FEATURES.works.soft}`}>
      <CheckButton done={done} label={done ? `Remettre « ${work.title} » à faire` : `Terminer « ${work.title} »`} onClick={() => !pending && onToggle()} />
      <Link
        href={`/works/${work.id}`}
        aria-disabled={pending}
        onClick={e => pending && e.preventDefault()}
        className="flex-1 min-w-0 flex items-center gap-3 py-3.5"
      >
        <div className="flex-1 min-w-0">
          <p className={`font-semibold leading-snug ${done ? 'text-ink-muted' : ''}`}>{work.title}</p>
          {detail && <p className="text-xs text-ink-muted mt-0.5 truncate">{detail}</p>}
        </div>
        {people.length > 0 && (
          <div className="flex -space-x-2 shrink-0">
            {people.map(p => (
              <Avatar key={p.uid} name={p.name} url={p.avatarUrl} size={28} className="ring-2 ring-surface" />
            ))}
          </div>
        )}
      </Link>
    </li>
  )
}
