'use client'

import { useRef, useState, useTransition } from 'react'
import { getShoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem } from '@/app/(app)/actions'
import type { ShoppingItem } from '@/types/database'

export default function ShoppingList({ initialItems }: {
  initialItems: ShoppingItem[]
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
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
    const itemNotes = notes.trim()
    setName('')
    setNotes('')
    inputRef.current?.focus()
    startTransition(async () => {
      await addShoppingItem(itemName, itemNotes)
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
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
          <button type="submit" disabled={isPending} className="bg-black text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">+</button>
        </div>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optionnel)"
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
        />
      </form>

      <ul className="flex flex-col gap-2">
        {activeItems.map(item => (
          <li key={item.id} className="bg-white rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm">
            <button onClick={() => toggleItem(item)} className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-black transition-colors" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.name}</p>
              {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
            </div>
            <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
          </li>
        ))}
        {activeItems.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">La liste est vide 🎉</p>
        )}
      </ul>

      {historyItems.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            {showHistory ? '▾' : '▸'} Historique ({historyItems.length})
          </button>
          {showHistory && (
            <ul className="flex flex-col gap-2 mt-2">
              {historyItems.map(item => (
                <li key={item.id} className="bg-white rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm opacity-50">
                  <button onClick={() => toggleItem(item)} className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 bg-gray-200 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through">{item.name}</p>
                    {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
