'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addShoppingItem,
  deleteShoppingItem,
  getItemMemory,
  getShoppingItems,
  setShoppingItemInList,
  updateShoppingItem,
  type ItemMemory,
  type ShoppingItemDetails,
} from '@/app/(app)/actions'
import { AISLES, aisleFor, emojiFor, itemKey, normalize, sameItemName, searchCatalog } from '@/lib/shopping/catalog'
import ItemTile from '@/components/shopping/ItemTile'
import ItemDetailsSheet from '@/components/shopping/ItemDetailsSheet'
import PageHeader from '@/components/ui/PageHeader'
import ActionBar, { barIcon } from '@/components/ui/ActionBar'
import { FEATURES } from '@/lib/ui/features'
import Icon from '@/components/ui/Icon'
import type { ShoppingItem } from '@/types/database'

const RECENTS_LIMIT = 30
const SUGGESTIONS_LIMIT = 12
const REFRESH_EVERY_MS = 30_000

function formatDetail(item: ShoppingItem) {
  const quantity = [item.quantity, item.unit].filter(Boolean).join(' ')
  return [quantity, item.notes].filter(Boolean).join(' · ') || null
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function aisleOf(item: ShoppingItem) {
  return item.category ?? aisleFor(item.name)
}

export default function ShoppingList({
  initialItems,
  initialMemory,
}: {
  initialItems: ShoppingItem[]
  initialMemory: Record<string, ItemMemory>
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems)
  // Emoji et rayon choisis à la main pour un produit, remis quand on le rajoute.
  const [memory, setMemory] = useState(initialMemory)
  const [query, setQuery] = useState('')
  // Article dont la fiche est ouverte. Le nom sert à le retrouver quand un
  // article tout juste ajouté reçoit son vrai id.
  const [details, setDetails] = useState<{ id: string; name: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pending = useRef(0)
  // Les enregistrements partent l'un après l'autre : les détails d'un article
  // tout juste ajouté ne sont envoyés qu'une fois l'article créé.
  const queue = useRef<Promise<void>>(Promise.resolve())

  // Ne recharge depuis le serveur que quand aucune modification n'est en cours,
  // pour ne pas écraser un changement affiché mais pas encore enregistré.
  const refresh = useCallback(async () => {
    if (pending.current > 0) return
    const [data, memoryData] = await Promise.all([getShoppingItems(), getItemMemory()])
    if (pending.current === 0) {
      setItems(data)
      setMemory(memoryData)
    }
  }, [])

  function mutate(optimistic: (items: ShoppingItem[]) => ShoppingItem[], action: () => Promise<void>) {
    setItems(optimistic)
    pending.current += 1
    queue.current = queue.current
      .then(action)
      .catch(error => console.error(error))
      .finally(() => {
        pending.current -= 1
        refresh()
      })
  }

  // Récupère les ajouts de l'autre personne quand on revient sur la page, et toutes les 30 s.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const interval = setInterval(onVisible, REFRESH_EVERY_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      clearInterval(interval)
    }
  }, [refresh])

  function addByName(rawName: string) {
    const name = rawName.trim()
    if (!name) return
    const existing = items.find(i => sameItemName(i.name, name))
    const remembered = memory[itemKey(name)]
    const category = existing?.category ?? remembered?.category ?? aisleFor(name)
    const emoji = existing ? existing.emoji : remembered?.emoji ?? null
    const now = new Date().toISOString()
    const tempId = `temp-${now}`
    setQuery('')
    // La fiche détails s'ouvre à chaque ajout ; on peut la fermer sans rien remplir.
    setDetails({ id: existing?.id ?? tempId, name: existing?.name ?? name })
    mutate(
      current => existing
        ? current.map(i => (i.id === existing.id ? { ...i, inList: true, updatedAt: now } : i))
        : [{
            id: tempId,
            name,
            quantity: null,
            unit: null,
            notes: null,
            category,
            emoji,
            inList: true,
            addedBy: '',
            createdAt: now,
            updatedAt: now,
          }, ...current],
      () => addShoppingItem(name, { quantity: null, unit: '', notes: '', category, emoji }),
    )
  }

  function setInList(item: ShoppingItem, inList: boolean) {
    if (item.id.startsWith('temp-')) return
    const now = new Date().toISOString()
    mutate(
      current => current.map(i => (i.id === item.id ? { ...i, inList, updatedAt: now } : i)),
      () => setShoppingItemInList(item.id, inList),
    )
  }

  function saveDetails(item: ShoppingItem, details: ShoppingItemDetails) {
    mutate(
      current => current.map(i => (i.id === item.id
        ? {
            ...i,
            quantity: details.quantity,
            unit: details.unit || null,
            notes: details.notes.trim() || null,
            category: details.category,
            emoji: details.emoji,
          }
        : i)),
      // Un article qui vient d'être ajouté n'a pas encore d'id : on repasse par
      // l'ajout, qui retrouve l'article par son nom et enregistre les détails.
      () => (item.id.startsWith('temp-')
        ? addShoppingItem(item.name, details)
        : updateShoppingItem(item.id, details)),
    )
  }

  function remove(item: ShoppingItem) {
    setDetails(null)
    mutate(
      current => current.filter(i => i.id !== item.id),
      () => deleteShoppingItem(item.id),
    )
  }

  function openDetails(item: ShoppingItem) {
    setDetails({ id: item.id, name: item.name })
  }

  const inList = items.filter(i => i.inList)
  const recents = items
    .filter(i => !i.inList)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENTS_LIMIT)

  const aisles = AISLES
    .map(aisle => ({
      ...aisle,
      items: inList
        .filter(i => aisleOf(i) === aisle.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
    .filter(aisle => aisle.items.length > 0)

  const suggestions = useMemo(() => {
    const q = normalize(query)
    if (!q) return null
    const known = items
      .filter(i => normalize(i.name).split(/[ -]/).some(word => word.startsWith(q)) || normalize(i.name).startsWith(q))
      .sort((a, b) => Number(b.inList) - Number(a.inList) || b.updatedAt.localeCompare(a.updatedAt))
    const fromCatalog = searchCatalog(query, SUGGESTIONS_LIMIT)
      .filter(entry => !items.some(i => sameItemName(i.name, entry.name)))
    const exactMatch = [...known.map(i => i.name), ...fromCatalog.map(e => e.name)]
      .some(name => sameItemName(name, query))
    return { known: known.slice(0, SUGGESTIONS_LIMIT), fromCatalog, exactMatch }
  }, [query, items])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!suggestions) return
    // « tomate » + Entrée ajoute « Tomates » si l'article est connu
    const match = suggestions.known.find(i => sameItemName(i.name, query))?.name
      ?? suggestions.fromCatalog.find(entry => sameItemName(entry.name, query))?.name
      ?? capitalize(query.trim())
    addByName(match)
  }

  // Un article temporaire change d'id une fois enregistré : on le retrouve par son nom.
  const detailsItem = details
    ? items.find(i => i.id === details.id) ?? items.find(i => sameItemName(i.name, details.name))
    : undefined
  const grid = 'grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2'

  return (
    <div className="page-wrap">
      <PageHeader
        feature="shopping"
        aside={inList.length ? `${inList.length} article${inList.length > 1 ? 's' : ''}` : undefined}
      />

      {suggestions ? (
        <section aria-label="Suggestions">
          <div className={grid}>
            {suggestions.known.map(item => (
              <ItemTile
                key={item.id}
                variant={item.inList ? 'inList' : 'suggestion'}
                emoji={emojiFor(item.name, item.category, item.emoji)}
                name={item.name}
                detail={item.inList ? 'Déjà dans la liste' : formatDetail(item)}
                onTap={() => (item.inList ? openDetails(item) : addByName(item.name))}
                onLongPress={() => openDetails(item)}
              />
            ))}
            {suggestions.fromCatalog.map(entry => (
              <ItemTile
                key={entry.name}
                variant="suggestion"
                emoji={emojiFor(entry.name, entry.aisle, memory[itemKey(entry.name)]?.emoji)}
                name={entry.name}
                onTap={() => addByName(entry.name)}
              />
            ))}
            {!suggestions.exactMatch && (
              <ItemTile
                variant="new"
                emoji={emojiFor(query, null, memory[itemKey(query)]?.emoji)}
                name={capitalize(query.trim())}
                detail="Ajouter"
                onTap={() => addByName(capitalize(query.trim()))}
              />
            )}
          </div>
        </section>
      ) : (
        <>
          {aisles.length === 0 ? (
            <p className="card text-center text-ink-muted text-sm py-10">Rien à acheter pour l’instant</p>
          ) : (
            <div className="flex flex-col gap-6">
              {aisles.map(aisle => (
                <section key={aisle.id} aria-labelledby={`aisle-${aisle.id}`}>
                  <h3 id={`aisle-${aisle.id}`} className="font-display font-semibold text-lg tracking-tight mb-2 flex items-center gap-2">
                    <Icon name={aisle.icon} size={20} /> {aisle.label}
                  </h3>
                  <div className={grid}>
                    {aisle.items.map(item => (
                      <ItemTile
                        key={item.id}
                        variant="inList"
                        emoji={emojiFor(item.name, item.category, item.emoji)}
                        name={item.name}
                        detail={formatDetail(item)}
                        onTap={() => setInList(item, false)}
                        onLongPress={() => openDetails(item)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              <p className="text-xs text-ink-muted">
                Touchez un article quand il est dans le chariot. Appui long pour la quantité, une précision ou le rayon.
              </p>
            </div>
          )}

          {recents.length > 0 && (
            <section aria-labelledby="recents" className="mt-10">
              <h3 id="recents" className="font-display font-semibold text-lg tracking-tight mb-2">Récemment achetés</h3>
              <div className={grid}>
                {recents.map(item => (
                  <ItemTile
                    key={item.id}
                    variant="recent"
                    emoji={emojiFor(item.name, item.category, item.emoji)}
                    name={item.name}
                    onTap={() => setInList(item, true)}
                    onLongPress={() => openDetails(item)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ActionBar>
        <form onSubmit={submit} className="flex items-center gap-1 w-full min-w-0">
          <input
            ref={inputRef}
            id="shopping-search"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              window.scrollTo({ top: 0 })
            }}
            placeholder="Ajouter un article…"
            aria-label="Ajouter un article"
            autoComplete="off"
            enterKeyHint="done"
            className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-muted"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className={`${barIcon} hover:bg-coconut`} aria-label="Effacer">
              ×
            </button>
          )}
          <button
            type={query.trim() ? 'submit' : 'button'}
            onClick={() => { if (!query.trim()) inputRef.current?.focus() }}
            aria-label="Ajouter l’article"
            className={`${barIcon} ${FEATURES.shopping.fill}`}
          >
            <Icon name="plus" />
          </button>
        </form>
      </ActionBar>

      {detailsItem && (
        <ItemDetailsSheet
          key={details?.name}
          item={detailsItem}
          onSave={d => saveDetails(detailsItem, d)}
          onDelete={detailsItem.id.startsWith('temp-') ? undefined : () => remove(detailsItem)}
          onClose={() => {
            setDetails(null)
            inputRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}
