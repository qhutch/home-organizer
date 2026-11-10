'use client'

import { useEffect, useRef, useState } from 'react'
import Emoji from '@/components/ui/Emoji'
import EmojiPicker from '@/components/ui/EmojiPicker'
import { emojiFor } from '@/lib/shopping/catalog'
import { formatQuantity } from '@/lib/recipes/ingredients'
import type { RecipeIngredient } from '@/types/database'
import { FEATURES } from '@/lib/ui/features'

const QUANTITY_SHORTCUTS = [1, 2, 3, 4, 6]
const UNITS = ['g', 'kg', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousse', 'tranche', 'sachet']

function parseQuantity(value: string) {
  const n = parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Fiche d'un ingrédient dans le formulaire, comme la fiche d'un article de courses :
// nom, quantité, unité, emoji. Chaque choix s'applique tout de suite.
export default function IngredientSheet({
  ingredient,
  onChange,
  onDelete,
  onClose,
}: {
  ingredient: RecipeIngredient
  onChange: (ingredient: RecipeIngredient) => void
  onDelete: () => void
  onClose: () => void
}) {
  const shortcut = ingredient.quantity !== null && QUANTITY_SHORTCUTS.includes(ingredient.quantity)
  const [otherQuantity, setOtherQuantity] = useState(ingredient.quantity !== null && !shortcut ? formatQuantity(ingredient.quantity) : '')
  const [pickingEmoji, setPickingEmoji] = useState(false)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const update = (patch: Partial<RecipeIngredient>) => onChange({ ...ingredient, ...patch })
  const chip = (active: boolean) => `chip${active ? ' is-active' : ''}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="ingredient-title">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPickingEmoji(open => !open)}
            className="rounded-2xl p-1 -m-1 hover:bg-coconut/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss"
            aria-label="Changer l’emoji"
            aria-expanded={pickingEmoji}
          >
            <Emoji name={emojiFor(ingredient.name, null, ingredient.emoji)} size={40} />
          </button>
          <h3 id="ingredient-title" className="font-display font-semibold text-2xl tracking-tight flex-1 min-w-0 break-words first-letter:uppercase">{ingredient.name || 'Ingrédient'}</h3>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink text-2xl leading-none px-1" aria-label="Fermer">×</button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="ingredient-name" className="eyebrow">Nom</label>
          <input
            id="ingredient-name"
            value={ingredient.name}
            onChange={e => update({ name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onClose() } }}
            enterKeyHint="done"
            className="field"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="eyebrow mb-2">Quantité</legend>
          <div className="flex flex-wrap gap-2">
            {QUANTITY_SHORTCUTS.map(q => (
              <button
                key={q}
                type="button"
                className={chip(!otherQuantity && ingredient.quantity === q)}
                onClick={() => {
                  const active = !otherQuantity && ingredient.quantity === q
                  setOtherQuantity('')
                  update({ quantity: active ? null : q })
                }}
              >
                {q}
              </button>
            ))}
            <input
              inputMode="decimal"
              value={otherQuantity}
              onChange={e => {
                const value = e.target.value.replace(/[^\d.,]/g, '')
                setOtherQuantity(value)
                update({ quantity: parseQuantity(value) })
              }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onClose() } }}
              placeholder="Autre"
              aria-label="Autre quantité"
              className="chip w-24 focus:outline-2 focus:outline-moss"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {UNITS.map(u => (
              <button key={u} type="button" className={chip(ingredient.unit === u)} onClick={() => update({ unit: ingredient.unit === u ? null : u })}>
                {u}
              </button>
            ))}
          </div>
        </fieldset>

        <EmojiPicker
          value={ingredient.emoji ?? ''}
          onChange={emoji => update({ emoji: emoji || null })}
          open={pickingEmoji}
          onToggle={() => setPickingEmoji(open => !open)}
          label="Emoji de l’ingrédient"
        />

        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={onDelete} className="text-sm text-pink-deep hover:text-ink px-1 py-3">
            Supprimer l’ingrédient
          </button>
          <button type="button" onClick={onClose} className={`btn-feature ml-auto ${FEATURES.recipes.fill}`}>OK</button>
        </div>
      </div>
    </div>
  )
}
