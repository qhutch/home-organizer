'use client'

import { useEffect, useState } from 'react'
import ItemTile from '@/components/shopping/ItemTile'
import Icon from '@/components/ui/Icon'
import { AISLES } from '@/lib/shopping/catalog'
import { loadShoppingList, type SavedList } from '@/lib/shopping/saved'

// La liste de courses gardée sur le téléphone (lib/shopping/saved.ts), quand Hestia ne répond pas.
// Toucher un article le coche, ici seulement : rien n'est envoyé.
export default function SavedShoppingList() {
  const [list, setList] = useState<SavedList | null | undefined>(undefined)
  const [taken, setTaken] = useState<string[]>([])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage n'existe que dans le navigateur
  useEffect(() => setList(loadShoppingList()), [])

  if (!list?.items.length) return null
  const saved = new Date(list.savedAt).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
  const aisles = AISLES
    .map(aisle => ({
      ...aisle,
      items: list.items.filter(i => i.aisle === aisle.id).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
    .filter(aisle => aisle.items.length > 0)

  return (
    <section aria-labelledby="saved-list" className="mt-8">
      <h2 id="saved-list" className="font-display font-semibold text-xl tracking-tight">Ma liste de courses</h2>
      <p className="text-sm text-ink-muted mb-4">Enregistrée {saved}</p>
      <div className="space-y-6">
        {aisles.map(aisle => (
          <section key={aisle.id}>
            <h3 className="font-display font-semibold text-lg tracking-tight mb-2 flex items-center gap-2">
              <Icon name={aisle.icon} size={20} /> {aisle.label}
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2">
              {aisle.items.map(item => (
                <ItemTile
                  key={item.name}
                  variant="inList"
                  emoji={item.emoji}
                  name={item.name}
                  detail={item.detail}
                  checked={taken.includes(item.name)}
                  onTap={() => setTaken(t => (t.includes(item.name) ? t.filter(n => n !== item.name) : [...t, item.name]))}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
