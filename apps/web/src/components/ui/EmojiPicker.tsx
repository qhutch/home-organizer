'use client'

import { useState } from 'react'
import Emoji from '@/components/ui/Emoji'
import { searchEmojis } from '@/lib/shopping/catalog'

// Section « Emoji » d'une fiche (article de courses, ingrédient) : « Changer » ouvre une recherche
// et une grille ; « Auto » remet celui du catalogue. value : '' = automatique.
// open est tenu par la fiche, pour que toucher l'emoji du titre l'ouvre aussi.
export default function EmojiPicker({
  value,
  onChange,
  open,
  onToggle,
  label,
}: {
  value: string
  onChange: (emoji: string) => void
  open: boolean
  onToggle: () => void
  // Nom de la grille pour les lecteurs d'écran
  label: string
}) {
  const [query, setQuery] = useState('')
  const results = searchEmojis(query)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Emoji</span>
        <button type="button" className="text-sm text-ink-muted hover:text-ink underline underline-offset-2" onClick={onToggle} aria-expanded={open}>
          {open ? 'Fermer' : 'Changer'}
        </button>
      </div>
      {open && (
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            // Entrée ne ferme pas la fiche : elle choisit le premier résultat.
            if (e.key === 'Enter') {
              e.preventDefault()
              if (query && results[0]) onChange(results[0])
            }
          }}
          placeholder="Chercher : fromage, vis, plante…"
          aria-label="Chercher un emoji"
          enterKeyHint="done"
          className="field"
        />
      )}
      {open && results.length === 0 && (
        <p className="text-sm text-ink-muted py-2">Aucun emoji pour « {query.trim()} »</p>
      )}
      {open && results.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5" role="radiogroup" aria-label={label}>
          {!query && <button
            type="button"
            role="radio"
            aria-checked={!value}
            onClick={() => onChange('')}
            className={`aspect-square rounded-2xl bg-surface text-[11px] leading-tight text-ink-muted font-medium flex items-center justify-center text-center ${!value ? 'ring-2 ring-moss' : 'hover:bg-coconut/50'}`}
          >
            Auto
          </button>}
          {results.map(name => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={value === name}
              aria-label={name.replace(/_/g, ' ')}
              onClick={() => onChange(name)}
              className={`aspect-square rounded-2xl bg-surface flex items-center justify-center ${value === name ? 'ring-2 ring-moss' : 'hover:bg-coconut/50'}`}
            >
              <Emoji name={name} size={30} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
