// Copie de la liste de courses gardée sur le téléphone (localStorage), mise à jour à chaque changement
// de la liste affichée. Elle reste lisible quand Hestia ne répond pas : écran d'erreur ((app)/error.tsx)
// et page hors connexion (public/offline.html, servie par public/sw.js). Ne pas changer la clé ni la forme
// sans mettre à jour offline.html.
import { AISLES, aisleFor, emojiFor, getAisle } from '@/lib/shopping/catalog'
import type { ShoppingItem } from '@/types/database'

export const SAVED_LIST_KEY = 'hestia:shopping'

// aisleLabel et order (place du rayon dans le magasin) servent à offline.html, qui n'a pas le catalogue
export type SavedItem = { name: string; emoji: string; aisle: string; aisleLabel: string; order: number; detail: string | null }
export type SavedList = { savedAt: string; items: SavedItem[] }

export function saveShoppingList(items: ShoppingItem[]) {
  const list: SavedList = {
    savedAt: new Date().toISOString(),
    items: items.filter(i => i.inList).map(i => {
      const aisle = getAisle(i.category ?? aisleFor(i.name))
      return {
      name: i.name,
      emoji: emojiFor(i.name, i.category, i.emoji),
      aisle: aisle.id,
      aisleLabel: aisle.label,
      order: AISLES.indexOf(aisle),
      detail: [[i.quantity, i.unit].filter(Boolean).join(' '), i.notes].filter(Boolean).join(' · ') || null,
      }
    }),
  }
  try { localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(list)) } catch { /* stockage plein ou bloqué */ }
}

export function loadShoppingList(): SavedList | null {
  try {
    const list = JSON.parse(localStorage.getItem(SAVED_LIST_KEY) ?? 'null') as SavedList | null
    return list && Array.isArray(list.items) ? list : null
  } catch {
    return null
  }
}
