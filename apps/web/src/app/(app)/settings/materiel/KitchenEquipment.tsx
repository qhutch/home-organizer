'use client'

import { useState, useTransition } from 'react'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import IngredientTile, { ingredientGrid } from '@/components/recipes/IngredientTile'
import { equipmentEmoji } from '@/lib/recipes/equipment'
import { KITCHEN_GROUPS, kitchenGroup, kitchenNames, sameKitchenName } from '@/lib/recipes/kitchen-names.mjs'
import type { KitchenItem } from '@/lib/recipes/kitchen'
import { FEATURES } from '@/lib/ui/features'
import { setKitchenEquipment } from '../actions'

// Le matériel de cuisine du foyer, comme les ingrédients de « Ajouter aux courses » :
// une tuile par ustensile, cochée = on l'a. Chaque toucher s'enregistre tout de suite.
// La barre du bas ajoute un ustensile qui n'est pas dans la liste (coché).
export default function KitchenEquipment({ initialItems }: { initialItems: KitchenItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function save(name: string, have: boolean) {
    setItems(list => {
      const others = list.filter(i => !sameKitchenName(i.name, name))
      return [...others, { name, group: kitchenGroup(name), have }].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    })
    setError(null)
    startTransition(async () => {
      try {
        const result = await setKitchenEquipment(name, have)
        if (result.error) setError(result.error)
      } catch {
        setError('Ça n’a pas marché. Réessaie.')
      }
    })
  }

  function add(e: React.FormEvent) {
    e.preventDefault()
    const name = kitchenNames(newName)[0]
    if (!name) return
    save(items.find(i => sameKitchenName(i.name, name))?.name ?? name, true)
    setNewName('')
  }

  const count = items.filter(i => i.have).length

  return (
    <>
      <p className="text-ink-muted text-sm mb-6">{count} sur {items.length}</p>
      <div className="flex flex-col gap-6">
        {KITCHEN_GROUPS.map(([group, label]) => {
          const inGroup = items.filter(i => i.group === group)
          if (!inGroup.length) return null
          return (
            <section key={group} aria-labelledby={`kitchen-${group}`}>
              <h2 id={`kitchen-${group}`} className="font-display font-semibold text-lg mb-2">{label}</h2>
              <div className={ingredientGrid}>
                {inGroup.map(item => (
                  <IngredientTile
                    key={item.name}
                    ingredient={{ name: item.name, quantity: null, unit: null }}
                    emoji={equipmentEmoji(item.name)}
                    selected={item.have}
                    onTap={() => save(item.name, !item.have)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {error && <p role="alert" className="text-sm text-pink-deep mt-4">{error}</p>}

      <ActionBar>
        <form onSubmit={add} className="flex items-center gap-1 w-full min-w-0 min-h-11">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ajouter du matériel…"
            aria-label="Ajouter du matériel"
            autoComplete="off"
            enterKeyHint="done"
            className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint"
          />
          {newName.trim() && (
            <button type="submit" aria-label="Ajouter le matériel" className={`icon-btn-fill ${FEATURES.recipes.fill}`}>
              <Icon name="plus" />
            </button>
          )}
        </form>
      </ActionBar>
    </>
  )
}
