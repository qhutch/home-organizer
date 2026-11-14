import { createHmac, hkdfSync, timingSafeEqual } from 'crypto'
import type { AlbumRef, PhotoItem, ThumbSize } from './synology'

// Liens signés des miniatures : seul le serveur sait les fabriquer (il les donne aux membres connectés),
// et la signature suffit à les servir. Comme le lien change quand la photo change (cache_key),
// Vercel peut garder la miniature dans son cache, partagé par tous les appareils du foyer :
// après la première fois, elle arrive sans repasser par le NAS.
// Contrepartie : quelqu'un qui obtiendrait un de ces liens verrait cette miniature, sans rien d'autre.

function secret() {
  const raw = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!raw) throw new Error('Pas de clé serveur (FIREBASE_PRIVATE_KEY)')
  return Buffer.from(hkdfSync('sha256', Buffer.from(raw, 'utf8'), Buffer.alloc(0), 'hestia-photo-links', 32))
}

const payload = (household: string, album: string, id: number, key: string, size: string) => `${household}|${album}|${id}|${key}|${size}`
const sign = (text: string) => createHmac('sha256', secret()).update(text).digest('base64url').slice(0, 32)

export function thumbLink(household: string, album: AlbumRef, item: Pick<PhotoItem, 'id' | 'key'>, size: ThumbSize) {
  const signature = sign(payload(household, album, item.id, item.key, size))
  return `/api/photos/thumb?${new URLSearchParams({ f: household, a: album, i: String(item.id), k: item.key, s: size, t: signature })}`
}

export function checkThumbLink(household: string, album: string, id: number, key: string, size: string, signature: string) {
  const expected = Buffer.from(sign(payload(household, album, id, key, size)))
  const given = Buffer.from(signature)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
