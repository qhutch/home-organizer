'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import CheckButton from '@/components/works/CheckButton'
import { FEATURES } from '@/lib/ui/features'
import type { WorkCheck } from '@/types/database'

// Liste à cocher d'un travail (étapes, matériel) : une ligne par case, le texte se corrige en place,
// la croix l'enlève ; une pilule de saisie avec le + en ajoute une.
export default function Checklist({ items, onChange, placeholder, addLabel }: {
  items: WorkCheck[]
  // typing : le texte d'une ligne change (enregistré après une pause)
  onChange: (items: WorkCheck[], options?: { typing?: boolean }) => void
  placeholder: string
  addLabel: string
}) {
  const [draft, setDraft] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    onChange([...items, { text, done: false }])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="bg-surface hairline rounded-2xl flex items-center pl-1 pr-1">
              <CheckButton
                done={item.done}
                label={item.done ? `Décocher « ${item.text} »` : `Cocher « ${item.text} »`}
                onClick={() => onChange(items.map((it, j) => (j === i ? { ...it, done: !it.done } : it)))}
              />
              <input
                value={item.text}
                onChange={e => onChange(items.map((it, j) => (j === i ? { ...it, text: e.target.value } : it)), { typing: true })}
                onBlur={e => {
                  if (!e.target.value.trim()) onChange(items.filter((_, j) => j !== i))
                }}
                aria-label={`Ligne ${i + 1}`}
                maxLength={200}
                className={`flex-1 min-w-0 bg-transparent py-2.5 text-base focus:outline-none ${item.done ? 'line-through text-ink-muted' : ''}`}
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={`Enlever « ${item.text} »`}
                className="icon-btn icon-btn-sm text-ink-muted"
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="bg-surface hairline rounded-full flex items-center gap-1 p-1">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={addLabel}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={200}
          className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint"
        />
        {draft.trim() && (
          <button type="submit" aria-label={addLabel} className={`icon-btn-fill ${FEATURES.works.fill}`}>
            <Icon name="plus" />
          </button>
        )}
      </form>
    </div>
  )
}
