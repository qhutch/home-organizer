'use client'

import { useRef, useState, useTransition } from 'react'
import { getShoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem } from '@/app/(app)/actions'
import type { ShoppingItem } from '@/types/database'

const UNITS = ['', 'kg', 'g', 'L', 'mL', 'pièces', 'boîtes', 'sachets', 'bouteilles', 'tranches']

function formatQuantity(item: ShoppingItem) {
  if (!item.quantity && !item.unit) return null
  const parts = []
  if (item.quantity) parts.push(item.quantity)
  if (item.unit) parts.push(item.unit)
  return parts.join(' ')
}

export default function ShoppingList({ initialItems }: {
  initialItems: ShoppingItem[]
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    const data = await getShoppingItems() as ShoppingItem[]
    setItems(data)
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const itemName = name.trim()
    const itemQty = quantity ? parseFloat(quantity) : null
    const itemUnit = unit.trim()
    const itemNotes = notes.trim()
    setName('')
    setQuantity('')
    setUnit('')
    setNotes('')
    setShowDetails(false)
    inputRef.current?.focus()
    startTransition(async () => {
      await addShoppingItem(itemName, itemQty, itemUnit, itemNotes)
      await refresh()
    })
  }

  async function toggleItem(item: ShoppingItem) {
    startTransition(async () => {
      await toggleShoppingItem(item.id, item.inList)
      await refresh()
    })
  }

  async function deleteItem(id: string) {
    startTransition(async () => {
      await deleteShoppingItem(id)
      await refresh()
    })
  }

  const activeItems = items.filter(i => i.inList)
  const historyItems = items.filter(i => !i.inList)

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold mb-4">Liste de courses</h2>

      <form onSubmit={addItem} className="flex flex-col gap-2 mb-6">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ajouter un article..."
            className="flex-1 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="border border-zinc-700 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:border-zinc-500 transition-colors bg-zinc-900"
            title="Quantité / commentaire"
          >
            {showDetails ? '−' : '···'}
          </button>
          <button type="submit" disabled={isPending} className="bg-zinc-100 text-zinc-900 rounded-xl px-4 py-3 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors">+</button>
        </div>

        {showDetails && (
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="Qté"
              className="w-20 border border-zinc-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-zinc-900"
            />
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-32 border border-zinc-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-zinc-900"
            >
              {UNITS.map(u => <option key={u} value={u}>{u || 'Unité...'}</option>)}
            </select>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Commentaire (optionnel)"
              className="flex-1 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-zinc-900"
            />
          </div>
        )}
      </form>

      <ul className="flex flex-col gap-2">
        {activeItems.map(item => (
          <li key={item.id} className="bg-zinc-700 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm">
            <button onClick={() => toggleItem(item)} className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 border-zinc-500 hover:border-zinc-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-medium">{item.name}</p>
                {formatQuantity(item) && (
                  <span className="text-xs text-zinc-400 shrink-0">{formatQuantity(item)}</span>
                )}
              </div>
              {item.notes && <p className="text-xs text-zinc-400 mt-0.5">{item.notes}</p>}
            </div>
            <button onClick={() => deleteItem(item.id)} className="text-zinc-500 hover:text-red-400 transition-colors text-lg leading-none">×</button>
          </li>
        ))}
        {activeItems.length === 0 && (
          <p className="text-center text-zinc-400 text-sm py-8">La liste est vide 🎉</p>
        )}
      </ul>

      {historyItems.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            {showHistory ? '▾' : '▸'} Historique ({historyItems.length})
          </button>
          {showHistory && (
            <ul className="flex flex-col gap-2 mt-2">
              {historyItems.map(item => (
                <li key={item.id} className="bg-zinc-700 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm opacity-50">
                  <button onClick={() => toggleItem(item)} className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 border-zinc-500 bg-zinc-600 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm line-through">{item.name}</p>
                      {formatQuantity(item) && (
                        <span className="text-xs text-zinc-400 shrink-0 line-through">{formatQuantity(item)}</span>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-zinc-400 mt-0.5">{item.notes}</p>}
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-zinc-500 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
