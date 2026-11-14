import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/firebase/admin'
import { DOCUMENTS_FOLDER, getNasConnection, STORAGE_SUFFIX, type NasConnection } from '@/lib/storage/nas'
import { openSecret, sealSecret } from '@/lib/storage/secrets'

// Où sont rangés les fichiers des documents (les infos — nom, taille… — sont dans Firestore).
// Réglé par foyer : son NAS (Réglages › NAS), par WebDAV dans le dossier DOCUMENTS_FOLDER.
// Sans NAS, en local seulement : un dossier sur l'ordinateur (DOCUMENTS_STORAGE=local), pour essayer.
// Sans rangement, on ne peut pas ajouter de document.
type Backend = {
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

function folderStorage(root: string): Backend {
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

// Dossiers déjà créés sur un NAS (évite de les recréer à chaque morceau)
const madeFolders = new Set<string>()

// Le NAS du foyer, par WebDAV, derrière son gardien (infra/nas-tunnel : /webdav → WebDAV Server du NAS)
function webdavStorage(conn: NasConnection): Backend {
  const base = `${conn.url}/webdav/${DOCUMENTS_FOLDER}`
  const headers = {
    Authorization: `Basic ${Buffer.from(`${conn.account}:${conn.password}`).toString('base64')}`,
    'X-Hestia-Key': conn.gatekeeperKey,
  }
  async function request(method: string, target: string, body?: Buffer) {
    try {
      return await fetch(`${base}/${target}`, {
        method,
        headers,
        body: body ? new Uint8Array(body) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
      })
    } catch {
      throw new Error('Le NAS ne répond pas')
    }
  }
  // Crée les dossiers parents d'une clé (405 : il existe déjà)
  async function makeParents(key: string) {
    const parts = key.split('/')
    for (let i = 1; i < parts.length; i++) {
      const folder = parts.slice(0, i).join('/')
      const id = `${base}/${folder}`
      if (madeFolders.has(id)) continue
      const response = await request('MKCOL', `${folder}/`)
      if (!response.ok && response.status !== 405) throw new Error(`Dossier refusé par le NAS (${response.status})`)
      madeFolders.add(id)
    }
  }
  return {
    async put(key, data) {
      await makeParents(checkKey(key))
      const response = await request('PUT', key, data)
      if (!response.ok) throw new Error(`Envoi refusé par le NAS (${response.status})`)
    },
    async get(key) {
      const response = await request('GET', checkKey(key))
      if (!response.ok) throw new Error(`Lecture refusée par le NAS (${response.status})`)
      return Buffer.from(await response.arrayBuffer())
    },
    async exists(key) {
      return (await request('HEAD', checkKey(key))).ok
    },
    async removeAll(prefix) {
      const response = await request('DELETE', `${checkKey(prefix)}/`)
      if (!response.ok && response.status !== 404) throw new Error(`Effacement refusé par le NAS (${response.status})`)
      for (const id of madeFolders) if (id.startsWith(`${base}/${prefix}`)) madeFolders.delete(id)
    },
  }
}

// --- Chiffrement ---
// Chaque morceau est chiffré par Hestia avant d'être rangé (AES-256-GCM) : sur le NAS, les fichiers sont illisibles.
// Chaque foyer a sa propre clé (tirée au hasard, rangée chiffrée dans households/{hid}/storage/keys).
// Elle est elle-même chiffrée avec DOCUMENTS_ENCRYPTION_KEY (32 octets en base64), qui vit seulement dans Vercel
// et .env.local : la perdre, c'est perdre les documents. La garder aussi dans un gestionnaire de mots de passe.
// Les premiers documents d'essai étaient chiffrés directement avec DOCUMENTS_ENCRYPTION_KEY (encrypted sans keyScope).
// Morceau rangé = vecteur (12 octets) + étiquette d'authenticité (16) + données chiffrées.
// Le chemin du morceau est lié au chiffrement : un morceau déplacé ou échangé est refusé.

// Comment un document est chiffré, d'après ses infos dans Firestore
export type Encryption = 'none' | 'app' | 'household'
export function encryptionOf(doc: { encrypted?: unknown; keyScope?: unknown }): Encryption {
  if (doc.keyScope === 'household') return 'household'
  return doc.encrypted ? 'app' : 'none'
}

function appKey() {
  const raw = process.env.DOCUMENTS_ENCRYPTION_KEY
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('DOCUMENTS_ENCRYPTION_KEY doit faire 32 octets (en base64)')
  return key
}

const householdKeys = new Map<string, Buffer>()

// La clé des documents du foyer, créée la première fois qu'on en a besoin
async function householdKey(householdId: string): Promise<Buffer> {
  const cached = householdKeys.get(householdId)
  if (cached) return cached
  // En local, une clé à part (« keys-dev »), comme pour le NAS
  const ref = db.collection('households').doc(householdId).collection('storage').doc(`keys${STORAGE_SUFFIX}`)
  const context = `households/${householdId}/storage/keys${STORAGE_SUFFIX}/documents`
  const key = await db.runTransaction(async tx => {
    const sealed = (await tx.get(ref)).data()?.documents as string | undefined
    if (sealed) return Buffer.from(openSecret<string>(sealed, context), 'base64')
    const fresh = randomBytes(32)
    tx.set(ref, { documents: sealSecret(fresh.toString('base64'), context), createdAt: new Date().toISOString() }, { merge: true })
    return fresh
  })
  householdKeys.set(householdId, key)
  return key
}

function seal(secret: Buffer, key: string, data: Buffer) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secret, iv)
  cipher.setAAD(Buffer.from(key))
  const body = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

function unseal(secret: Buffer, key: string, data: Buffer) {
  const decipher = createDecipheriv('aes-256-gcm', secret, data.subarray(0, 12))
  decipher.setAAD(Buffer.from(key))
  decipher.setAuthTag(data.subarray(12, 28))
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()])
}

// Le rangement du foyer, avec chiffrement : null s'il n'a pas de rangement ou s'il manque la clé (on ne range rien en clair).
// Les nouveaux documents sont chiffrés avec la clé du foyer : les enregistrer avec keyScope: 'household'.
export async function documentStorage(householdId: string) {
  const app = appKey()
  if (!app) return null
  const connection = await getNasConnection(householdId)
  const local = (process.env.DOCUMENTS_STORAGE ?? (process.env.NODE_ENV === 'development' ? 'local' : '')) === 'local'
  const backend = connection
    ? webdavStorage(connection)
    : local ? folderStorage(process.env.DOCUMENTS_LOCAL_DIR ?? path.join(process.cwd(), '.documents')) : null
  if (!backend) return null
  return {
    put: async (key: string, data: Buffer) => backend.put(key, seal(await householdKey(householdId), key, data)),
    get: async (key: string, encryption: Encryption) => {
      const data = await backend.get(key)
      if (encryption === 'none') return data
      return unseal(encryption === 'app' ? app : await householdKey(householdId), key, data)
    },
    exists: (key: string) => backend.exists(key),
    removeAll: (prefix: string) => backend.removeAll(prefix),
  }
}

export function chunkKey(householdId: string, documentId: string, index: number | 'thumb') {
  return `${householdId}/${documentId}/${index}`
}
