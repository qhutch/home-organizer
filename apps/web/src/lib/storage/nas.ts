import { db } from '@/lib/firebase/admin'
import { openSecret, sealSecret } from '@/lib/storage/secrets'

// Le NAS d'un foyer : réglé par foyer (households/{hid}/storage/nas), jamais pour toute l'app.
// Il sert aux Photos (Synology Photos) et aux Documents (WebDAV, dossier DOCUMENTS_FOLDER).
// On le joint par son tunnel (voir infra/nas-tunnel) ; Google Drive viendra plus tard pour les foyers sans NAS.

export type NasConnection = {
  provider: 'synology'
  // Adresse du tunnel, ex. https://hestia-nas.tail1234.ts.net
  url: string
  account: string
  password: string
  // Clé montrée au gardien du NAS (en-tête X-Hestia-Key)
  gatekeeperKey: string
}

// Dossier partagé du NAS où vont les documents (chiffrés), accessible au seul compte Hestia
export const DOCUMENTS_FOLDER = 'Hestia-documents'

type StoredConnection = {
  provider: 'synology'
  url: string
  account: string
  secret: string
  updatedBy: string
  updatedAt: string
  // Partage des albums créés dans Hestia : compte Synology de chaque membre (uid → id Synology Photos)
  // et groupe proposé sous le nom « Famille » à la création d'un album.
  // Absent = pas encore relié (Hestia relie tout seul par le prénom, voir lib/photos/sharing.ts) ; null = « Aucun » choisi.
  memberAccounts?: Record<string, number | null>
  familyGroupId?: number | null
}

export type NasSharing = { memberAccounts: Record<string, number | null>; familyGroupId: number | null | undefined }

const storageRef = (householdId: string) => db.collection('households').doc(householdId).collection('storage')
const context = (householdId: string) => `households/${householdId}/storage/nas`

// Premier essai (13 nov. 2026) : le réglage s'appelait « photos » ; on le relit s'il est encore là
async function stored(householdId: string): Promise<{ data: StoredConnection; context: string } | null> {
  const nas = (await storageRef(householdId).doc('nas').get()).data() as StoredConnection | undefined
  if (nas) return { data: nas, context: context(householdId) }
  const legacy = (await storageRef(householdId).doc('photos').get()).data() as StoredConnection | undefined
  return legacy ? { data: legacy, context: `households/${householdId}/storage/photos` } : null
}

export async function getNasConnection(householdId: string): Promise<NasConnection | null> {
  const found = await stored(householdId)
  if (!found || found.data.provider !== 'synology') return null
  // Secret illisible (enregistré avec une autre DOCUMENTS_ENCRYPTION_KEY, ex. en local) : comme pas de NAS,
  // les Réglages proposent alors de le rebrancher
  try {
    const { password, gatekeeperKey } = openSecret<{ password: string; gatekeeperKey: string }>(found.data.secret, found.context)
    return { provider: 'synology', url: found.data.url, account: found.data.account, password, gatekeeperKey }
  } catch (e) {
    console.error('NAS : identifiants illisibles', e instanceof Error ? e.message : e)
    return null
  }
}

// Ce que les Réglages peuvent montrer, sans aucun secret
export async function describeNasConnection(householdId: string) {
  const found = await stored(householdId)
  return found ? { url: found.data.url, account: found.data.account } : null
}

export async function getNasSharing(householdId: string): Promise<NasSharing> {
  const data = (await stored(householdId))?.data
  return { memberAccounts: data?.memberAccounts ?? {}, familyGroupId: data?.familyGroupId }
}

// Écrit dans le réglage existant (jamais un réglage sans NAS)
export async function saveNasSharing(householdId: string, sharing: Partial<NasSharing>) {
  const found = await stored(householdId)
  if (!found) return
  await db.doc(found.context).set(sharing, { merge: true })
}

export async function saveNasConnection(householdId: string, uid: string, connection: NasConnection) {
  // On garde le partage déjà réglé (comptes des membres, Famille) quand on rebranche le NAS
  const sharing = await getNasSharing(householdId)
  const data: StoredConnection = {
    ...sharing,
    provider: 'synology',
    url: connection.url,
    account: connection.account,
    secret: sealSecret({ password: connection.password, gatekeeperKey: connection.gatekeeperKey }, context(householdId)),
    updatedBy: uid,
    updatedAt: new Date().toISOString(),
  }
  await storageRef(householdId).doc('nas').set(data)
  await storageRef(householdId).doc('photos').delete()
}

export async function removeNasConnection(householdId: string) {
  await Promise.all([storageRef(householdId).doc('nas').delete(), storageRef(householdId).doc('photos').delete()])
}
