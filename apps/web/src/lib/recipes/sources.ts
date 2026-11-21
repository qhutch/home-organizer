import type { Recipe } from '@/types/database'

// Source d'une recette, pour le filtre « Source » de la bibliothèque : le livre de cuisine,
// le site du lien d'origine (Instagram, Marmiton…), ou « Sans source » (écrite par nous).
export type RecipeSource = { id: string; label: string; kind: 'book' | 'site' | 'none' }

const SITE_NAMES: Record<string, string> = {
  'instagram.com': 'Instagram', 'tiktok.com': 'TikTok', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube',
  'facebook.com': 'Facebook', 'pinterest.com': 'Pinterest', 'pinterest.fr': 'Pinterest', 'marmiton.org': 'Marmiton',
}

function siteName(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^(www|m|fr)\./, '')
    return SITE_NAMES[host] ?? host
  } catch {
    return null
  }
}

// Le livre sans la page ni l'auteur : « Simplissime, Jean-François Mallet (Hachette Pratique), p. 46 » → « Simplissime ».
// Les livres du robot Companion (Moulinex), écrits de plusieurs façons, sont regroupés.
export function bookName(book: string) {
  if (/companion/i.test(book)) return 'Cuisine Companion'
  const title = book.replace(/,\s*(p\.|n°)\s*\d+\s*$/i, '')
  let depth = 0
  for (let i = 0; i < title.length; i++) {
    if (title[i] === '(') depth++
    else if (title[i] === ')') depth--
    else if (title[i] === ',' && depth === 0) return title.slice(0, i).trim()
  }
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim() || title
}

export function recipeSource(recipe: Recipe): RecipeSource {
  if (recipe.sourceBook) {
    const name = bookName(recipe.sourceBook)
    return { id: `book:${name}`, label: name, kind: 'book' }
  }
  const site = recipe.sourceUrl ? siteName(recipe.sourceUrl) : null
  if (site) return { id: `site:${site}`, label: site, kind: 'site' }
  return { id: 'none', label: 'Sans source', kind: 'none' }
}

// Les sources des recettes : les sites, puis les livres (les plus fréquents d'abord), « Sans source » à la fin
const KIND_ORDER = { site: 0, book: 1, none: 2 }
export function recipeSources(recipes: Recipe[]) {
  const counts = new Map<string, { source: RecipeSource; count: number }>()
  for (const r of recipes) {
    const source = recipeSource(r)
    const entry = counts.get(source.id) ?? { source, count: 0 }
    entry.count++
    counts.set(source.id, entry)
  }
  return [...counts.values()]
    .sort((a, b) => KIND_ORDER[a.source.kind] - KIND_ORDER[b.source.kind] || b.count - a.count || a.source.label.localeCompare(b.source.label))
    .map(e => e.source)
}
