import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto'

// Identifiants des rangements d'un foyer (mot de passe du NAS, clé du gardien…), chiffrés avant d'aller dans Firestore.
// La clé est tirée de DOCUMENTS_ENCRYPTION_KEY (HKDF, avec son propre libellé) : une seule clé à garder dans Vercel.
// Format : base64( vecteur 12 octets + étiquette 16 octets + données chiffrées ).

function secretsKey() {
  const raw = process.env.DOCUMENTS_ENCRYPTION_KEY
  if (!raw) throw new Error('Pas de clé de chiffrement (DOCUMENTS_ENCRYPTION_KEY)')
  const master = Buffer.from(raw, 'base64')
  if (master.length !== 32) throw new Error('DOCUMENTS_ENCRYPTION_KEY doit faire 32 octets (en base64)')
  return Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), 'hestia-storage-secrets', 32))
}

// `context` lie le secret à sa place (foyer, rangement) : recopié ailleurs, il est refusé.
export function sealSecret(value: unknown, context: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretsKey(), iv)
  cipher.setAAD(Buffer.from(context))
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}

export function openSecret<T>(sealed: string, context: string): T {
  const raw = Buffer.from(sealed, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', secretsKey(), raw.subarray(0, 12))
  decipher.setAAD(Buffer.from(context))
  decipher.setAuthTag(raw.subarray(12, 28))
  const data = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])
  return JSON.parse(data.toString('utf8')) as T
}
