import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto'

// Secrets rangés chiffrés dans Firestore. Deux clés possibles, toutes deux tirées (HKDF) d'un secret du serveur :
// - 'server' (par défaut) : identifiants des rangements d'un foyer (mot de passe du NAS, clé du gardien…),
//   tirée de FIREBASE_PRIVATE_KEY, qui existe partout où Hestia tourne. Si cette clé change un jour,
//   il suffit de rebrancher le NAS dans Réglages.
// - 'documents' : la clé des documents d'un foyer, tirée de DOCUMENTS_ENCRYPTION_KEY. La perdre, c'est perdre
//   les documents : elle doit être gardée à part (gestionnaire de mots de passe).
// Format : base64( vecteur 12 octets + étiquette 16 octets + données chiffrées ).
export type SecretKind = 'server' | 'documents'

function master(kind: SecretKind) {
  if (kind === 'documents') {
    const raw = process.env.DOCUMENTS_ENCRYPTION_KEY
    if (!raw) throw new Error('Pas de clé de chiffrement (DOCUMENTS_ENCRYPTION_KEY)')
    const key = Buffer.from(raw, 'base64')
    if (key.length !== 32) throw new Error('DOCUMENTS_ENCRYPTION_KEY doit faire 32 octets (en base64)')
    return { key, label: 'hestia-storage-secrets' }
  }
  const raw = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!raw) throw new Error('Pas de clé serveur (FIREBASE_PRIVATE_KEY)')
  return { key: Buffer.from(raw, 'utf8'), label: 'hestia-server-secrets' }
}

function secretsKey(kind: SecretKind) {
  const { key, label } = master(kind)
  return Buffer.from(hkdfSync('sha256', key, Buffer.alloc(0), label, 32))
}

// `context` lie le secret à sa place (foyer, rangement) : recopié ailleurs, il est refusé.
export function sealSecret(value: unknown, context: string, kind: SecretKind = 'server'): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretsKey(kind), iv)
  cipher.setAAD(Buffer.from(context))
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}

export function openSecret<T>(sealed: string, context: string, kind: SecretKind = 'server'): T {
  const raw = Buffer.from(sealed, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', secretsKey(kind), raw.subarray(0, 12))
  decipher.setAAD(Buffer.from(context))
  decipher.setAuthTag(raw.subarray(12, 28))
  const data = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])
  return JSON.parse(data.toString('utf8')) as T
}
