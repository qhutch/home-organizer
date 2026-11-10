import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import path from 'path'

// Où sont rangés les fichiers des documents (les infos — nom, taille… — sont dans Firestore).
// Pour l'instant : un dossier sur l'ordinateur, pour essayer en local (DOCUMENTS_STORAGE=local).
// À venir : le NAS du foyer, par WebDAV. Sans rangement choisi, on ne peut pas ajouter de document.
export type DocumentStorage = {
  put(key: string, data: Buffer): Promise<void>
  get(key: string): Promise<Buffer>
  exists(key: string): Promise<boolean>
  // Efface tout ce qui commence par `prefix/`
  removeAll(prefix: string): Promise<void>
}

const SAFE_KEY = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/

function checkKey(key: string) {
  if (!SAFE_KEY.test(key)) throw new Error('Clé de document invalide')
  return key
}

function folderStorage(root: string): DocumentStorage {
  const file = (key: string) => path.join(root, checkKey(key))
  return {
    async put(key, data) {
      await mkdir(path.dirname(file(key)), { recursive: true })
      await writeFile(file(key), data)
    },
    get: key => readFile(file(key)),
    async exists(key) {
      return stat(file(key)).then(() => true, () => false)
    },
    async removeAll(prefix) {
      await rm(file(prefix), { recursive: true, force: true })
    },
  }
}

// --- Chiffrement ---
// Chaque morceau est chiffré par Hestia avant d'être rangé (AES-256-GCM) : sur le NAS, les fichiers sont illisibles.
// La clé (DOCUMENTS_ENCRYPTION_KEY, 32 octets en base64) vit seulement dans Vercel et .env.local :
// la perdre, c'est perdre les documents. La garder aussi dans un gestionnaire de mots de passe.
// Morceau rangé = vecteur (12 octets) + étiquette d'authenticité (16) + données chiffrées.
// Le chemin du morceau est lié au chiffrement : un morceau déplacé ou échangé est refusé.

function encryptionKey() {
  const raw = process.env.DOCUMENTS_ENCRYPTION_KEY
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('DOCUMENTS_ENCRYPTION_KEY doit faire 32 octets (en base64)')
  return key
}

function seal(key: string, data: Buffer) {
  const secret = encryptionKey()
  if (!secret) throw new Error('Pas de clé de chiffrement des documents')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secret, iv)
  cipher.setAAD(Buffer.from(key))
  const body = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

function unseal(key: string, data: Buffer) {
  const secret = encryptionKey()
  if (!secret) throw new Error('Pas de clé de chiffrement des documents')
  const decipher = createDecipheriv('aes-256-gcm', secret, data.subarray(0, 12))
  decipher.setAAD(Buffer.from(key))
  decipher.setAuthTag(data.subarray(12, 28))
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()])
}

// Le rangement, avec chiffrement : null s'il manque le rangement ou la clé (on ne range rien en clair)
export function documentStorage() {
  const kind = process.env.DOCUMENTS_STORAGE ?? (process.env.NODE_ENV === 'development' ? 'local' : '')
  const backend = kind === 'local' ? folderStorage(process.env.DOCUMENTS_LOCAL_DIR ?? path.join(process.cwd(), '.documents')) : null
  if (!backend || !encryptionKey()) return null
  return {
    put: (key: string, data: Buffer) => backend.put(key, seal(key, data)),
    // encrypted = false : les tout premiers essais, rangés en clair
    get: async (key: string, encrypted: boolean) => {
      const data = await backend.get(key)
      return encrypted ? unseal(key, data) : data
    },
    exists: (key: string) => backend.exists(key),
    removeAll: (prefix: string) => backend.removeAll(prefix),
  }
}

export function chunkKey(householdId: string, documentId: string, index: number | 'thumb') {
  return `${householdId}/${documentId}/${index}`
}
