'use client'

import { useEffect, useRef, useState } from 'react'
import { AISLES, aisleFor, emojiFor } from '@/lib/shopping/catalog'
import Emoji from '@/components/ui/Emoji'
import EmojiPicker from '@/components/ui/EmojiPicker'
import type { ShoppingItemDetails } from '@/app/(app)/actions'
import type { ShoppingItem } from '@/types/database'

const QUANTITY_SHORTCUTS = [1, 2, 3, 4, 6]
const UNITS = ['kg', 'g', 'L', 'cL', 'pièces', 'boîtes', 'sachets', 'bouteilles', 'tranches']
// Délai avant d'enregistrer ce qui est tapé au clavier
const TYPING_DELAY_MS = 700

// emoji : '' = celui du catalogue
type Form = { quantity: string; unit: string; notes: string; category: string; emoji: string }

function toDetails(form: Form): ShoppingItemDetails {
  const parsed = form.quantity ? parseFloat(form.quantity.replace(',', '.')) : null
  return {
    quantity: parsed && Number.isFinite(parsed) ? parsed : null,
    unit: form.unit,
    notes: form.notes,
    category: form.category || null,
    emoji: form.emoji || null,
  }
}

// Fiche détails d'un article. Tout s'enregistre au fur et à mesure :
// les choix tout de suite, le texte après une courte pause ou à la fermeture.
export default function ItemDetailsSheet({
  item,
  onSave,
  onDelete,
  onClose,
}: {
  item: ShoppingItem
  onSave: (details: ShoppingItemDetails) => void
  // Absent pour un article pas encore enregistré
  onDelete?: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Form>({
    quantity: item.quantity ? String(item.quantity) : '',
    unit: item.unit ?? '',
    notes: item.notes ?? '',
    category: item.category ?? aisleFor(item.name),
    emoji: item.emoji ?? '',
  })
  // Ce qui est tapé dans « Autre » : gardé à part pour que taper « 1 » (avant « 12 »)
  // ne bascule pas sur le raccourci 1 en vidant le champ.
  const [otherQuantity, setOtherQuantity] = useState(
    QUANTITY_SHORTCUTS.map(String).includes(form.quantity) ? '' : form.quantity,
  )
  const [pickingEmoji, setPickingEmoji] = useState(false)
  const latest = useRef(form)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unsaved = useRef(false)

  function update(patch: Partial<Form>, { typing = false } = {}) {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setForm(next)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    if (typing) {
      unsaved.current = true
      typingTimer.current = setTimeout(() => {
        unsaved.current = false
        onSave(toDetails(latest.current))
      }, TYPING_DELAY_MS)
    } else {
      unsaved.current = false
      onSave(toDetails(next))
    }
  }

  function close() {
    if (typingTimer.current) clearTimeout(typingTimer.current)
    if (unsaved.current) {
      unsaved.current = false
      onSave(toDetails(latest.current))
    }
    onClose()
  }

  // Échap ferme la fiche (et enregistre le texte en cours).
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const chip = (active: boolean) => `chip${active ? ' is-active' : ''}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="item-details-title">
      <button type="button" aria-label="Fermer" onClick={close} className="absolute inset-0 bg-ink/40" />
      <form
        onSubmit={e => {
          e.preventDefault()
          close()
        }}
        className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPickingEmoji(open => !open)}
            className="rounded-2xl p-1 -m-1 hover:bg-coconut/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss"
            aria-label="Changer l’emoji"
            aria-expanded={pickingEmoji}
          >
            <Emoji name={emojiFor(item.name, form.category, form.emoji)} size={40} />
          </button>
          <h3 id="item-details-title" className="font-display font-semibold text-2xl tracking-tight flex-1 min-w-0 break-words">{item.name}</h3>
          <button type="button" onClick={close} className="text-ink-muted hover:text-ink text-2xl leading-none px-1" aria-label="Fermer">×</button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="eyebrow mb-2">Quantité</legend>
          <div className="flex flex-wrap gap-2">
            {QUANTITY_SHORTCUTS.map(q => (
              <button
                key={q}
                type="button"
                className={chip(!otherQuantity && form.quantity === String(q))}
                onClick={() => {
                  const active = !otherQuantity && form.quantity === String(q)
                  setOtherQuantity('')
                  update({ quantity: active ? '' : String(q) })
                }}
              >
                {q}
              </button>
            ))}
            <input
              id="item-quantity"
              inputMode="decimal"
              value={otherQuantity}
              onChange={e => {
                const value = e.target.value.replace(/[^\d.,]/g, '')
                setOtherQuantity(value)
                update({ quantity: value }, { typing: true })
              }}
              placeholder="Autre"
              aria-label="Autre quantité"
              className="chip w-24 focus:outline-2 focus:outline-moss"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {UNITS.map(u => (
              <button key={u} type="button" className={chip(form.unit === u)} onClick={() => update({ unit: form.unit === u ? '' : u })}>
                {u}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="item-notes" className="eyebrow">Précision</label>
          <input
            id="item-notes"
            value={form.notes}
            onChange={e => update({ notes: e.target.value }, { typing: true })}
            placeholder="Bio, demi-écrémé, la marque habituelle…"
            maxLength={200}
            enterKeyHint="done"
            className="field"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="item-category" className="eyebrow">Rayon</label>
          <select
            id="item-category"
            value={form.category}
            onChange={e => update({ category: e.target.value })}
            className="field"
          >
            {AISLES.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>

        <EmojiPicker
          value={form.emoji}
          onChange={emoji => update({ emoji })}
          open={pickingEmoji}
          onToggle={() => setPickingEmoji(open => !open)}
          label="Emoji de l’article"
        />

        <div className="flex items-center gap-3 pt-1">
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (typingTimer.current) clearTimeout(typingTimer.current)
                onDelete()
              }}
              className="text-sm text-pink-deep hover:text-ink px-1 py-3"
            >
              Supprimer l’article
            </button>
          )}
          <button type="submit" className="btn ml-auto">
            OK
          </button>
        </div>
      </form>
    </div>
  )
}
