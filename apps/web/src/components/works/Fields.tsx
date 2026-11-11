'use client'

import { useEffect, useRef, useState } from 'react'

// Morceaux communs des fiches Travaux et Artisans

export function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display font-semibold text-lg mb-2 flex items-baseline gap-2">
        {title}
        {aside && <span className="text-sm font-sans font-medium text-ink-muted">{aside}</span>}
      </h2>
      {children}
    </section>
  )
}

// Nom en grand, modifiable en place ; il passe à la ligne s'il est long, Entrée ne fait pas de retour à la ligne
export function TitleField({ value, onChange, label, maxLength }: {
  value: string
  onChange: (value: string) => void
  label: string
  maxLength: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
      aria-label={label}
      rows={1}
      maxLength={maxLength}
      className="block w-full resize-none overflow-hidden bg-transparent font-display font-semibold text-3xl tracking-tight leading-tight focus:outline-none mb-4"
    />
  )
}

export function parseAmount(text: string) {
  const value = parseFloat(text.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : null
}

// Montant en euros (budget, devis) ; le texte tapé est gardé tel quel (« 49,9 »)
export function MoneyField({ value, onChange, label }: { value: number | null; onChange: (value: number | null) => void; label: string }) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','))
  return (
    <div className="relative">
      <input
        value={text}
        onChange={e => {
          setText(e.target.value)
          onChange(parseAmount(e.target.value))
        }}
        inputMode="decimal"
        placeholder="0"
        aria-label={label}
        className="field pr-10"
      />
      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden>€</span>
    </div>
  )
}
