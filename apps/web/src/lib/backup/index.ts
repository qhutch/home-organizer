import { gzipSync } from 'zlib'
import { DocumentReference, GeoPoint, Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore'
import { db } from '@/lib/firebase/admin'
import { backupStorage } from '@/lib/documents/storage'
import { describeNasConnection } from '@/lib/storage/nas'

// Sauvegarde de la base d'un foyer sur son NAS, une fois par jour (cron Vercel, /api/cron/backup), à 8 h 30 UTC :
// juste après la remise à zéro du quota gratuit de Firestore, pour ne jamais manger la fin d'une journée chargée.
// Une sauvegarde par jour de la semaine (« lundi », « mardi »…) : celle de lundi prochain remplace celle
// d'aujourd'hui. Toujours 7 sauvegardes au plus, donc la place ne grossit pas, et une semaine pour
// s'apercevoir d'un problème. Rangées dans Hestia-documents/{foyer}/sauvegardes/{jour}/{0, 1…}
// (morceaux de 8 Mo), chiffrées avec DOCUMENTS_ENCRYPTION_KEY. Relire : scripts/restore-backup.mjs.
// Coût : une lecture Firestore par document du foyer, une fois par jour.

const PART_SIZE = 8 * 1024 * 1024
// Collections dont les documents ont des sous-collections (à compléter si on en ajoute)
const WITH_SUBCOLLECTIONS = new Set(['recipes'])
export const BACKUP_EVERY_MS = 20 * 60 * 60 * 1000

type Saved = { path: string; data: unknown }

// Les types de Firestore, écrits en JSON (relus par scripts/restore-backup.mjs)
function encode(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Timestamp) return { $ts: [value.seconds, value.nanoseconds] }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString('base64') }
  if (value instanceof DocumentReference) return { $ref: value.path }
  if (value instanceof GeoPoint) return { $geo: [value.latitude, value.longitude] }
  if (Array.isArray(value)) return value.map(encode)
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]))
}

async function collect(out: Saved[], snap: DocumentSnapshot) {
  if (snap.exists) out.push({ path: snap.ref.path, data: encode(snap.data()) })
}

async function collectCollection(out: Saved[], ref: FirebaseFirestore.CollectionReference) {
  const snap = await ref.get()
  for (const doc of snap.docs) {
    await collect(out, doc)
    if (WITH_SUBCOLLECTIONS.has(ref.id)) {
      for (const sub of await doc.ref.listCollections()) await collectCollection(out, sub)
    }
  }
}

// Tout ce qui appartient au foyer : le foyer et ses collections, et pour chaque membre son profil, sa photo,
// son lien vers le foyer et ses clés Face ID
async function householdData(householdId: string) {
  const out: Saved[] = []
  const household = db.collection('households').doc(householdId)
  await collect(out, await household.get())
  for (const collection of await household.listCollections()) await collectCollection(out, collection)
  const members = (await household.collection('members').select().get()).docs.map(d => d.id)
  for (const uid of members) {
    for (const top of ['userHouseholds', 'userProfiles', 'userAvatars']) await collect(out, await db.collection(top).doc(uid).get())
    await collectCollection(out, db.collection('userPasskeys').doc(uid).collection('credentials'))
  }
  return out
}

const dayName = (date: Date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }).format(date)

export type BackupStatus = { at: string | null; error: string | null }

// Pour l'accueil : la sauvegarde ne marche plus (dernière ratée, ou plus rien depuis 2 jours alors que le NAS
// est branché). null si tout va bien, ou si aucune sauvegarde n'a encore jamais été faite.
export async function backupProblem(householdId: string) {
  const [status, nas] = await Promise.all([backupStatus(householdId), describeNasConnection(householdId)])
  if (!nas || !status.at) return null
  const late = Date.now() - new Date(status.at).getTime() > 48 * 60 * 60 * 1000
  return status.error || late ? { since: status.at } : null
}

export async function backupStatus(householdId: string): Promise<BackupStatus> {
  const b = (await db.collection('households').doc(householdId).get()).data()?.backup
  return { at: (b?.at as string | undefined) ?? null, error: (b?.error as string | undefined) ?? null }
}

// Sauvegarde le foyer ; « skipped » si la dernière a moins de `minAgeMs` (ou s'il n'a pas de NAS)
export async function backupHousehold(householdId: string, minAgeMs = BACKUP_EVERY_MS) {
  const ref = db.collection('households').doc(householdId)
  const last = (await ref.get()).data()?.backup
  if (last?.at && !last.error && Date.now() - new Date(last.at).getTime() < minAgeMs) return 'skipped'
  const storage = await backupStorage(householdId)
  if (!storage) return 'skipped'

  const now = new Date()
  const day = dayName(now)
  try {
    const docs = await householdData(householdId)
    const file = storage.seal(gzipSync(JSON.stringify({ version: 1, householdId, createdAt: now.toISOString(), docs })))
    // On remplace la sauvegarde du même jour de la semaine dernière
    const folder = `${householdId}/sauvegardes/${day}`
    await storage.removeAll(folder)
    for (let i = 0; i * PART_SIZE < file.length; i++) {
      await storage.put(`${folder}/${i}`, file.subarray(i * PART_SIZE, (i + 1) * PART_SIZE))
    }
    await ref.set({ backup: { at: now.toISOString(), day, documents: docs.length, size: file.length, error: null } }, { merge: true })
    return 'done'
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await ref.set({ backup: { ...(last ?? {}), error, failedAt: now.toISOString() } }, { merge: true })
    throw e
  }
}
