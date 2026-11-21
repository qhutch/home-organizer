import { clean, LinkError, safeFetch } from '@/lib/recipes/from-link'

// Film ou série depuis un lien (souvent un post Instagram) : on lit le texte de la page
// et on en tire des titres possibles, que l'on cherche ensuite dans TMDB (sans IA).

const MAX_PAGE_BYTES = 3_000_000

// Le post lui-même (Instagram) : son image et son texte, pour reconnaître le film quand le titre
// n'est que dans la vidéo
export type LinkPost = { image: string | null; caption: string; author: string | null }

export type LinkClues =
  | { tmdb: { kind: 'movie' | 'tv'; id: number } }
  | { imdb: string }
  | { queries: string[]; post?: LinkPost }

const MAX_IMAGE_BYTES = 2_000_000

// Image du post, renvoyée telle quelle (data:) : Instagram refuse qu'on l'affiche depuis un autre site
async function inlineImage(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await safeFetch(url, 'image/*', MAX_IMAGE_BYTES, { asBrowser: false })
    if (!res.type.startsWith('image/')) return null
    return `data:${res.type.split(';')[0]};base64,${Buffer.from(res.body).toString('base64')}`
  } catch {
    return null
  }
}

function meta(html: string, name: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  return clean(tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? '')
}

async function page(url: string, { asBrowser = true } = {}): Promise<string> {
  const res = await safeFetch(url, 'text/html,application/xhtml+xml', MAX_PAGE_BYTES, { asBrowser })
  return new TextDecoder().decode(res.body)
}

// Instagram : la page d'intégration (publique) donne la légende du post en entier.
async function instagramPost(url: URL): Promise<LinkPost> {
  const code = url.pathname.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1]
  if (code) {
    try {
      const html = await page(`https://www.instagram.com/p/${code}/embed/captioned/`, { asBrowser: false })
      const block = html.match(/class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments/)?.[1]
      if (block) {
        const author = clean(block.match(/<a[^>]*class="CaptionUsername"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '') || null
        const caption = clean(block.replace(/<a[^>]*class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/, ''))
        const image = clean(html.match(/<img[^>]*class="EmbeddedMediaImage"[^>]*src="([^"]+)"/)?.[1] ?? '') || null
        return { caption, author, image: await inlineImage(image) }
      }
    } catch {
      // on essaie la page elle-même
    }
  }
  const html = await page(url.toString())
  // « 1 234 J'aime, 12 commentaires - compte le 3 novembre 2026 : "légende" »
  const caption = [meta(html, 'og:description').replace(/^[^:]*?:\s*/, ''), meta(html, 'og:title')].filter(Boolean).join('\n')
  return { caption, author: null, image: await inlineImage(meta(html, 'og:image') || null) }
}

const QUOTES = /[«“"]\s*([^«»“”"\n]{2,80}?)\s*[»”"]/g
const EMOJI_LEAD = /(?:🎬|🎥|📺|🍿|🎞️?|▶️)\s*:?\s*([^\n#@|•–—-]{2,80})/gu
// Listes : « 1. Dune », « - Oppenheimer »
const LISTED = /^\s*(?:\d{1,2}\s*[.)\-–]|[-•▪➡])\s*([^\n]{2,60})$/gmu
const LABELED = /(?:titre|film|s[ée]rie|serie|movie|show|à voir|a voir)\s*:\s*([^\n#@|•]{2,80})/giu

function tidy(value: string) {
  return value
    .replace(/\p{Extended_Pictographic}|️/gu, ' ')
    .replace(/\(\s*\d{4}\s*\)/g, ' ')
    .replace(/\s+(sur|on)\s+(netflix|prime|disney|canal|apple|max|hbo|paramount)\S*.*$/i, '')
    .replace(/[\s.,;:!?…]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Titres possibles, du plus probable au moins probable
export function titleQueries(text: string): string[] {
  const body = text.replace(/https?:\/\/\S+/g, ' ').replace(/@[\w.]+/g, ' ')
  const found: string[] = []
  const push = (value: string) => {
    const t = tidy(value)
    if (t.length >= 2 && t.length <= 80 && !found.some(f => f.toLowerCase() === t.toLowerCase())) found.push(t)
  }
  for (const re of [LABELED, EMOJI_LEAD, QUOTES, LISTED]) for (const m of body.matchAll(re)) push(m[1])
  // Lignes en capitales : « STRANGER THINGS »
  for (const line of body.split('\n')) {
    const letters = line.replace(/[^\p{L}]/gu, '')
    if (letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) push(line)
  }
  // Mots-clés : #StrangerThings → « Stranger Things »
  for (const m of body.matchAll(/#([\p{L}\d_]{3,40})/gu)) {
    const tag = m[1]
    if (/^(film|films|serie|series|série|séries|netflix|cinema|cinéma|movie|movies|reco|recommandation|fyp|pourtoi|tvshow)s?$/i.test(tag)) continue
    if (/[a-z][A-Z]/.test(tag)) push(tag.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '))
  }
  // Sinon, la première ligne du texte
  const first = body.split('\n').map(l => l.trim()).find(Boolean)
  if (first) push(first.split(/[.!?|•]/)[0])
  return found.slice(0, 8)
}

export async function readLink(raw: string): Promise<LinkClues> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new LinkError('Ce lien n’est pas valide.')
  }
  const host = url.hostname.replace(/^www\./, '')

  const tmdbPath = host.endsWith('themoviedb.org') && url.pathname.match(/\/(movie|tv)\/(\d+)/)
  if (tmdbPath) return { tmdb: { kind: tmdbPath[1] as 'movie' | 'tv', id: Number(tmdbPath[2]) } }

  const imdb = url.toString().match(/\b(tt\d{6,10})\b/)?.[1]
  if (imdb && host.endsWith('imdb.com')) return { imdb }

  try {
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
      const post = await instagramPost(url)
      return { queries: titleQueries(post.caption), post }
    }
    const html = await page(url.toString())
    const imdbInPage = html.match(/imdb\.com\/title\/(tt\d{6,10})/)?.[1]
    if (imdbInPage) return { imdb: imdbInPage }
    const title = meta(html, 'og:title') || clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    const description = meta(html, 'og:description')
    // « Stranger Things | Site officiel de Netflix » → « Stranger Things »
    const main = title.split(/\s[|–—-]\s/)[0]
    return { queries: titleQueries([main, title, description].filter(Boolean).join('\n')) }
  } catch (error) {
    if (error instanceof LinkError) throw error
    throw new LinkError('Impossible d’ouvrir ce lien.')
  }
}
