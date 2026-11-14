import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { parseIngredientLine } from '@/lib/recipes/ingredients'
import { cleanEquipment, guessEquipment } from '@/lib/recipes/equipment'
import { guessLabels } from '@/lib/recipes/guess-labels'
import type { RecipeCategoryId } from '@/lib/recipes/categories'
import type { ImportedRecipe } from '@/lib/recipes/import-code'

// Recette depuis un lien (Marmiton, 750g, Marie Claire…) : la plupart des sites de cuisine
// glissent dans leur page une fiche « Recipe » au format schema.org (JSON-LD), faite pour Google.
// On lit cette fiche, sans IA. Matériel et étiquettes sont devinés ici ; saisons et type de plat par le formulaire.

const TIMEOUT_MS = 10_000
const MAX_PAGE_BYTES = 5_000_000
const MAX_IMAGE_BYTES = 8_000_000
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

export class LinkError extends Error {}

// Adresses du réseau local ou de la machine : jamais lues (le serveur ne doit pas servir de relais).
function isPrivateAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v6 = ip.toLowerCase()
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7))
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
}

async function checkUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new LinkError('Ce lien n’est pas valide.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new LinkError('Ce lien n’est pas valide.')
  if (url.username || url.password || (url.port && url.port !== '80' && url.port !== '443')) throw new LinkError('Ce lien n’est pas valide.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (!addresses.length) throw new LinkError('Ce site est introuvable.')
  if (addresses.some(a => isPrivateAddress(a.address))) throw new LinkError('Ce lien n’est pas valide.')
  return url
}

// Suit les redirections à la main, pour vérifier chaque adresse.
async function safeFetch(raw: string, accept: string, maxBytes: number) {
  let url = await checkUrl(raw)
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': BROWSER_UA, Accept: accept, 'Accept-Language': 'fr-FR,fr;q=0.9' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const location = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && location) {
      url = await checkUrl(new URL(location, url).toString())
      continue
    }
    if (!res.ok) throw new LinkError(res.status === 403 || res.status === 429 ? 'Ce site refuse qu’Hestia lise ses pages.' : 'Impossible d’ouvrir cette page.')
    const length = Number(res.headers.get('content-length') ?? 0)
    if (length > maxBytes) throw new LinkError('Cette page est trop lourde.')
    const body = new Uint8Array(await res.arrayBuffer())
    if (body.byteLength > maxBytes) throw new LinkError('Cette page est trop lourde.')
    return { body, type: res.headers.get('content-type') ?? '', url }
  }
  throw new LinkError('Impossible d’ouvrir cette page.')
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', oelig: 'œ', deg: '°', hellip: '…' }

// Texte propre : sans balises ni entités HTML, espaces resserrés.
function clean(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .trim()
}

function asList(value: unknown): unknown[] {
  return value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]
}

function isType(item: Record<string, unknown>, type: string) {
  return asList(item['@type']).includes(type)
}

// Cherche la fiche Recipe dans tous les blocs JSON-LD (seule, dans une liste ou dans un @graph).
function findRecipe(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)
  for (const [, json] of blocks) {
    let data: unknown
    try {
      data = JSON.parse(json.trim())
    } catch {
      continue
    }
    const queue = asList(data)
    while (queue.length) {
      const item = queue.shift()
      if (!item || typeof item !== 'object') continue
      const obj = item as Record<string, unknown>
      if (isType(obj, 'Recipe')) return obj
      queue.push(...asList(obj['@graph']), ...asList(obj.mainEntity))
    }
  }
  return null
}

// Durée ISO 8601 (« PT1H30M ») → minutes
function minutes(value: unknown): number | null {
  const m = typeof value === 'string' && value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!m) return null
  const total = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return total > 0 ? total : null
}

function servings(value: unknown): number | null {
  for (const v of asList(value)) {
    const n = typeof v === 'number' ? v : parseInt(clean(v).match(/\d+/)?.[0] ?? '', 10)
    if (Number.isFinite(n) && n > 0) return Math.min(50, n)
  }
  return null
}

const CATEGORY_WORDS: [RegExp, RecipeCategoryId][] = [
  [/entr[ée]e|starter|appetizer/i, 'starter'],
  [/ap[ée]ritif|ap[ée]ro|amuse/i, 'aperitif'],
  [/dessert|g[âa]teau|p[âa]tisserie|go[ûu]ter/i, 'dessert'],
  [/petit[- ]d[ée]j|breakfast|brunch/i, 'breakfast'],
  [/boisson|cocktail|drink|smoothie/i, 'drink'],
  [/sauce|condiment/i, 'sauce'],
  [/plat|main|d[îi]ner|d[ée]jeuner/i, 'main'],
]

function categories(value: unknown): RecipeCategoryId[] {
  const found: RecipeCategoryId[] = []
  for (const v of asList(value)) {
    const word = clean(v)
    const match = CATEGORY_WORDS.find(([re]) => re.test(word))
    if (match && !found.includes(match[1])) found.push(match[1])
  }
  return found
}

// Ingrédients : une liste, ou (Marie Claire) un seul bloc de texte à couper ligne par ligne.
function ingredients(value: unknown) {
  return asList(value)
    .flatMap(v => clean(v).split(/\n+/))
    .map(line => parseIngredientLine(line))
    .filter(i => i !== null)
}

// Étapes : texte, HowToStep, ou HowToSection qui regroupe des étapes.
function steps(value: unknown): string[] {
  return asList(value).flatMap((v): string[] => {
    if (typeof v === 'string') return clean(v).split(/\n+/).map(s => s.trim()).filter(Boolean)
    if (!v || typeof v !== 'object') return []
    const obj = v as Record<string, unknown>
    if (obj.itemListElement) return steps(obj.itemListElement)
    const text = clean(obj.text ?? obj.name)
    return text ? [text] : []
  })
}

function imageUrl(value: unknown, base: URL): string | null {
  for (const v of asList(value)) {
    const raw = typeof v === 'string' ? v : v && typeof v === 'object' ? (v as Record<string, unknown>).url : null
    if (typeof raw === 'string' && raw) {
      try {
        return new URL(raw, base).toString()
      } catch {
        continue
      }
    }
  }
  return null
}

export type LinkedRecipe = { recipe: ImportedRecipe; photo: { data: string; type: string } | null }

export async function readRecipeFromLink(link: string): Promise<LinkedRecipe> {
  const page = await safeFetch(link.trim(), 'text/html,application/xhtml+xml', MAX_PAGE_BYTES).catch(error => {
    if (error instanceof LinkError) throw error
    throw new LinkError('Impossible d’ouvrir cette page.')
  })
  const data = findRecipe(new TextDecoder().decode(page.body))
  if (!data) throw new LinkError('Aucune recette trouvée sur cette page.')

  const title = clean(data.name).slice(0, 120)
  if (!title) throw new LinkError('Aucune recette trouvée sur cette page.')

  const prep = minutes(data.prepTime)
  const cook = minutes(data.cookTime)
  const recipe: ImportedRecipe = {
    title,
    categories: categories(data.recipeCategory),
    labels: [],
    seasons: [],
    servings: servings(data.recipeYield),
    prepMinutes: prep ?? (cook === null ? minutes(data.totalTime) : null),
    cookMinutes: cook,
    ingredients: ingredients(data.recipeIngredient),
    equipment: [],
    steps: steps(data.recipeInstructions),
    source: page.url.toString(),
  }

  // Matériel : celui donné par le site, complété par celui deviné d'après les étapes
  const tools = asList(data.tool).map(t => clean(typeof t === 'object' && t ? (t as Record<string, unknown>).name : t))
  recipe.equipment = cleanEquipment([...tools, ...guessEquipment(recipe.steps)])
  recipe.labels = guessLabels(recipe.title, recipe.ingredients, recipe.steps)

  // La photo du plat : facultative, on n'échoue pas si elle ne vient pas.
  let photo: LinkedRecipe['photo'] = null
  const image = imageUrl(data.image, page.url)
  if (image) {
    try {
      const file = await safeFetch(image, 'image/*', MAX_IMAGE_BYTES)
      if (file.type.startsWith('image/')) photo = { data: Buffer.from(file.body).toString('base64'), type: file.type.split(';')[0] }
    } catch {
      photo = null
    }
  }

  return { recipe, photo }
}
