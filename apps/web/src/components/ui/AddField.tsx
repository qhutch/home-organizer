'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import Icon from '@/components/ui/Icon'

// Le + de la barre du bas qui s'ouvre en champ de saisie (Courses, Films et séries).
// Fermé : un rond plein à droite. Au toucher, le champ s'ouvre sur toute la barre, clavier ouvert ;
// le + ajoute ce qu'on a tapé. Le champ est toujours là (replié à zéro) : sur iPhone, le clavier ne
// s'ouvre que si on donne le focus pendant le toucher lui-même.
export default function AddField({ value, onChange, onSubmit, placeholder, label, fill, inputRef, id, enterKeyHint = 'done', onOpenChange }: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  // « Ajouter un article » : le + fermé et le + qui ajoute
  label: string
  // FEATURES.<id>.fill
  fill: string
  inputRef?: RefObject<HTMLInputElement | null>
  id?: string
  enterKeyHint?: 'done' | 'search' | 'go'
  // Pour cacher le reste de la barre pendant la saisie
  onOpenChange?: (open: boolean) => void
}) {
  const ownRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? ownRef
  const [focused, setFocused] = useState(false)
  const open = focused || value !== ''
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })
  useEffect(() => {
    onOpenChangeRef.current?.(open)
  }, [open])

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (value.trim()) onSubmit()
      }}
      // Animation : la pilule s'étire vers la gauche depuis le +, le texte arrive ensuite
      style={{ width: open ? '100%' : '3.5rem' }}
      className={`ml-auto min-w-0 shrink-0 pointer-events-auto flex items-center rounded-full overflow-hidden bg-surface transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${open ? 'hairline' : ''}`}
    >
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        enterKeyHint={enterKeyHint}
        tabIndex={open ? 0 : -1}
        className={`flex-1 min-w-0 bg-transparent py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint transition-opacity motion-reduce:transition-none ${open
          ? 'pl-5 pr-2 opacity-100 duration-150 delay-150'
          : 'w-0 p-0 opacity-0 duration-100'}`}
      />
      {open && value && (
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(''); ref.current?.focus() }} className="icon-btn shrink-0" aria-label="Effacer">
          <Icon name="close" size={20} />
        </button>
      )}
      <button
        type={open ? 'submit' : 'button'}
        // Garde le clavier ouvert quand on ajoute (ordinateur)
        onMouseDown={e => open && e.preventDefault()}
        onClick={() => !open && ref.current?.focus()}
        aria-label={label}
        className={`icon-btn-fill icon-btn-lg shrink-0 ${fill}`}
      >
        <Icon name="plus" />
      </button>
    </form>
  )
}
