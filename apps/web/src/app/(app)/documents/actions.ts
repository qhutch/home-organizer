'use server'

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { adminAuth, db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { passkeysOf, relyingParty, saveChallenge, savePasskey, takeChallenge, updatePasskeyCounter } from '@/lib/documents/passkeys'
import { documentsUnlocked, lockDocuments, unlockDocuments } from '@/lib/documents/unlock'
import { chunkKey, documentStorage } from '@/lib/documents/storage'
import { folderPaths, isPaperKind, loadLibrary } from '@/lib/documents/library'
import type { PaperKind } from '@/types/database'
import { purgeDocuments } from '@/lib/documents/trash'
import { DOCUMENT_CHUNK_SIZE, DOCUMENT_MAX_SIZE, chunkCount, chunkSize } from '@/lib/documents/limits'

export type Duplicate = { name: string; place: string; href: string }
type Failure = { ok: false; error: string; duplicate?: Duplicate }
type Result<T = object> = ({ ok: true } & T) | Failure

const LOCKED = 'locked'

async function member() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  return { user, householdId: membership.householdId }
}

// Membre du foyer qui a fait Face ID il y a peu ; sinon null (l'écran se reverrouille)
async function unlockedMember() {
  const m = await member()
  return (await documentsUnlocked(m.user.uid)) ? m : null
}

// Membre qui peut continuer l'envoi d'un document : Face ID récent, ou un devis/une facture des Travaux
// (ceux-là s'envoient et s'ouvrent sans Face ID). Rend aussi le document.
async function uploader(id: string) {
  const m = await member()
  const ref = documents(m.householdId).doc(id)
  const doc = (await ref.get()).data()
  if (!doc) return null
  if (!isPaperKind(doc.paperKind) && !(await documentsUnlocked(m.user.uid))) return null
  return { ...m, ref, doc }
}

// Dossier où vont les devis et factures envoyés depuis Travaux : « Maison › Devis et Factures ».
// Créés au premier envoi (un « Maison » déjà là à la racine est réutilisé), puis retrouvés par leur id
// (households/{hid}.worksFolderId), même renommés ou déplacés.
async function worksFolder(householdId: string, uid: string) {
  const household = db.collection('households').doc(householdId)
  const id = (await household.get()).data()?.worksFolderId as string | undefined
  if (id && (await folders(householdId).doc(id).get()).exists) return id

  async function findOrCreate(parentId: string | null, name: string) {
    const siblings = await folders(householdId).where('parentId', '==', parentId).get()
    const same = siblings.docs.find(d => (d.data().name as string).trim().toLowerCase() === name.toLowerCase())
    if (same) return same.id
    const ref = await folders(householdId).add({ name, parentId, createdBy: uid, createdAt: FieldValue.serverTimestamp() })
    return ref.id
  }
  const house = await findOrCreate(null, 'Maison')
  const papers = await findOrCreate(house, 'Devis et Factures')
  await household.update({ worksFolderId: papers })
  return papers
}

export type PaperLink = { kind: PaperKind; workId: string | null; artisanId: string | null }

function documents(householdId: string) {
  return db.collection('households').doc(householdId).collection('documents')
}

function folders(householdId: string) {
  return db.collection('households').doc(householdId).collection('documentFolders')
}

// --- Face ID ---

// Ajouter Face ID sur un appareil : on vient de retaper son mot de passe (connexion de moins de 5 minutes),
// pour qu'une session restée ouverte ne suffise pas à ajouter son propre visage.
export async function startPasskeySetup(freshIdToken: string): Promise<Result<{ options: PublicKeyCredentialCreationOptionsJSON }>> {
  const { user } = await member()
  let fresh
  try {
    fresh = await adminAuth.verifyIdToken(freshIdToken)
  } catch {
    return { ok: false, error: 'Mot de passe à retaper' }
  }
  if (fresh.uid !== user.uid || Date.now() / 1000 - fresh.auth_time > 5 * 60) return { ok: false, error: 'Mot de passe à retaper' }

  const { rpID, rpName } = await relyingParty()
  const existing = await passkeysOf(user.uid)
  const profile = (await db.collection('userProfiles').doc(user.uid).get()).data()
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email ?? user.uid,
    userDisplayName: (profile?.displayName as string) || user.email || 'Hestia',
    userID: new TextEncoder().encode(user.uid),
    attestationType: 'none',
    excludeCredentials: existing.map(p => ({ id: p.id, transports: p.transports })),
    authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
  })
  await saveChallenge(user.uid, 'register', options.challenge)
  return { ok: true, options }
}

export async function finishPasskeySetup(response: RegistrationResponseJSON): Promise<Result> {
  const { user } = await member()
  const challenge = await takeChallenge(user.uid, 'register')
  if (!challenge) return { ok: false, error: 'C’était trop long, recommence' }
  const { rpID, origin } = await relyingParty()
  try {
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })
    if (!verified || !registrationInfo) return { ok: false, error: 'Face ID n’a pas été reconnu' }
    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo
    await savePasskey(user.uid, {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    })
  } catch {
    return { ok: false, error: 'Face ID n’a pas été reconnu' }
  }
  await unlockDocuments(user.uid)
  revalidate()
  return { ok: true }
}

export async function startUnlock(): Promise<Result<{ options: PublicKeyCredentialRequestOptionsJSON }>> {
  const { user } = await member()
  const passkeys = await passkeysOf(user.uid)
  if (!passkeys.length) return { ok: false, error: 'Face ID n’est pas encore activé' }
  const { rpID } = await relyingParty()
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map(p => ({ id: p.id, transports: p.transports })),
    userVerification: 'required',
  })
  await saveChallenge(user.uid, 'unlock', options.challenge)
  return { ok: true, options }
}

export async function finishUnlock(response: AuthenticationResponseJSON): Promise<Result> {
  const { user } = await member()
  const challenge = await takeChallenge(user.uid, 'unlock')
  if (!challenge) return { ok: false, error: 'C’était trop long, recommence' }
  const passkey = (await passkeysOf(user.uid)).find(p => p.id === response.id)
  if (!passkey) return { ok: false, error: 'Cet appareil n’a pas Face ID pour Hestia' }
  const { rpID, origin } = await relyingParty()
  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: passkey.id, publicKey: passkey.publicKey, counter: passkey.counter, transports: passkey.transports },
      requireUserVerification: true,
    })
    if (!verified) return { ok: false, error: 'Face ID n’a pas été reconnu' }
    await updatePasskeyCounter(user.uid, passkey.id, authenticationInfo.newCounter)
  } catch {
    return { ok: false, error: 'Face ID n’a pas été reconnu' }
  }
  await unlockDocuments(user.uid)
  revalidate()
  return { ok: true }
}

export async function lock() {
  await member()
  await lockDocuments()
  revalidate()
}

// --- Documents ---

const THUMB_MAX = 300 * 1024

// Un nom de dossier ou de document : sans espaces autour, ni vide ni trop long
function cleanName(name: string, max: number) {
  return name.replace(/\s+/g, ' ').trim().slice(0, max)
}

// Le dossier existe dans ce foyer (null = la racine, « Documents »)
async function folderExists(householdId: string, folderId: string | null) {
  return folderId === null || (await folders(householdId).doc(folderId).get()).exists
}

function revalidate() {
  revalidatePath('/documents', 'layout')
  revalidatePath('/')
  // Les devis et factures s'affichent aussi dans Travaux
  revalidatePath('/works', 'layout')
}

// sha256 : empreinte du fichier, calculée par le navigateur, pour repérer un document déjà rangé.
// force : l'ajouter quand même.
// paper : un devis ou une facture envoyé depuis Travaux, sans Face ID ; il va dans « Maison › Devis et Factures »
// (folderId ignoré) et la recherche de doublon ne regarde que les autres devis et factures.
export async function startDocumentUpload(
  file: { name: string; type: string; size: number; sha256: string },
  folderId: string | null,
  force = false,
  paper: PaperLink | null = null,
): Promise<Result<{ id: string }>> {
  const m = paper ? await member() : await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  if (!documentStorage()) return { ok: false, error: 'Le rangement des documents n’est pas encore branché' }
  let link: PaperLink | null = null
  if (paper) {
    if (!isPaperKind(paper.kind)) return { ok: false, error: 'Envoi impossible' }
    link = await checkedLink(m.householdId, paper)
    folderId = await worksFolder(m.householdId, m.user.uid)
  }
  if (!(await folderExists(m.householdId, folderId))) return { ok: false, error: 'Ce dossier n’existe plus' }
  const name = cleanName(file.name, 200)
  if (!name || !Number.isInteger(file.size) || file.size <= 0) return { ok: false, error: 'Fichier vide' }
  if (file.size > DOCUMENT_MAX_SIZE) return { ok: false, error: 'Fichier trop lourd (100 Mo au plus)' }
  const sha256 = /^[0-9a-f]{64}$/.test(file.sha256) ? file.sha256 : null

  if (sha256 && !force) {
    const same = await documents(m.householdId).where('sha256', '==', sha256).get()
    const existing = same.docs.find(d => d.data().status === 'ready' && (!paper || isPaperKind(d.data().paperKind)))
    if (existing) {
      const library = await loadLibrary(m.householdId)
      const found = library.documents.find(d => d.id === existing.id)
      if (found) return { ok: false, error: 'duplicate', duplicate: { name: found.name, place: found.place, href: found.href } }
    }
  }

  const ref = await documents(m.householdId).add({
    name,
    mimeType: file.type.slice(0, 100) || 'application/octet-stream',
    size: file.size,
    chunks: chunkCount(file.size),
    folderId,
    sha256,
    encrypted: true,
    hasThumb: false,
    expiresOn: null,
    paperKind: link?.kind ?? null,
    workId: link?.workId ?? null,
    artisanId: link?.artisanId ?? null,
    status: 'uploading',
    addedBy: m.user.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { ok: true, id: ref.id }
}

export async function uploadDocumentChunk(form: FormData): Promise<Result> {
  const storage = documentStorage()
  const id = String(form.get('id'))
  const index = Number(form.get('index'))
  const chunk = form.get('chunk')
  if (!storage || !(chunk instanceof Blob)) return { ok: false, error: 'Envoi impossible' }

  const m = await uploader(id)
  if (!m) return { ok: false, error: LOCKED }
  const doc = m.doc
  if (doc.status !== 'uploading' || doc.addedBy !== m.user.uid) return { ok: false, error: 'Envoi impossible' }
  if (!Number.isInteger(index) || index < 0 || index >= doc.chunks) return { ok: false, error: 'Envoi impossible' }
  if (chunk.size > DOCUMENT_CHUNK_SIZE || chunk.size !== chunkSize(doc.size, index)) return { ok: false, error: 'Envoi impossible' }

  await storage.put(chunkKey(m.householdId, id, index), Buffer.from(await chunk.arrayBuffer()))
  return { ok: true }
}

// form : id, et thumb (aperçu JPEG, facultatif)
export async function finishDocumentUpload(form: FormData): Promise<Result<{ href: string }>> {
  const storage = documentStorage()
  const id = String(form.get('id'))
  const m = await uploader(id)
  if (!m) return { ok: false, error: LOCKED }
  const { ref, doc } = m
  if (!storage || doc.status !== 'uploading' || doc.addedBy !== m.user.uid) return { ok: false, error: 'Envoi impossible' }

  const keys = Array.from({ length: doc.chunks as number }, (_, i) => chunkKey(m.householdId, id, i))
  const present = await Promise.all(keys.map(k => storage.exists(k)))
  if (present.includes(false)) return { ok: false, error: 'Envoi incomplet, recommence' }

  const thumb = form.get('thumb')
  const hasThumb = thumb instanceof Blob && thumb.size > 0 && thumb.size <= THUMB_MAX && thumb.type === 'image/jpeg'
  if (hasThumb) await storage.put(chunkKey(m.householdId, id, 'thumb'), Buffer.from(await thumb.arrayBuffer()))

  await ref.update({ status: 'ready', hasThumb })
  revalidate()
  const library = await loadLibrary(m.householdId)
  return { ok: true, href: library.documents.find(d => d.id === id)?.href ?? '/documents' }
}

// Envoi abandonné en route : on efface ce qui a déjà été envoyé
export async function cancelDocumentUpload(id: string): Promise<Result> {
  const m = await uploader(id)
  if (!m) return { ok: true }
  const { ref, doc } = m
  if (doc.status !== 'uploading' || doc.addedBy !== m.user.uid) return { ok: true }
  await documentStorage()?.removeAll(`${m.householdId}/${id}`)
  await ref.delete()
  return { ok: true }
}

export async function renameDocument(id: string, name: string): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const clean = cleanName(name, 200)
  if (!clean) return { ok: false, error: 'Il faut un nom' }
  const ref = documents(m.householdId).doc(id)
  if (!(await ref.get()).exists) return { ok: false, error: 'Ce document n’existe plus' }
  await ref.update({ name: clean })
  revalidate()
  return { ok: true }
}

// date : « AAAA-MM-JJ », ou null pour l'enlever
export async function setDocumentExpiry(id: string, date: string | null): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  if (date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) return { ok: false, error: 'Date invalide' }
  const ref = documents(m.householdId).doc(id)
  if (!(await ref.get()).exists) return { ok: false, error: 'Ce document n’existe plus' }
  await ref.update({ expiresOn: date })
  revalidate()
  return { ok: true }
}

// Rangés dans un dossier (null = à la racine) ; rend la nouvelle adresse de chacun
export async function moveDocuments(ids: string[], folderId: string | null): Promise<Result<{ hrefs: Record<string, string> }>> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  if (!(await folderExists(m.householdId, folderId))) return { ok: false, error: 'Ce dossier n’existe plus' }
  const batch = db.batch()
  for (const id of ids.slice(0, 500)) batch.update(documents(m.householdId).doc(id), { folderId })
  await batch.commit().catch(() => null)
  revalidate()
  const library = await loadLibrary(m.householdId)
  return { ok: true, hrefs: Object.fromEntries(library.documents.filter(d => ids.includes(d.id)).map(d => [d.id, d.href])) }
}

// À la corbeille : on peut les remettre pendant TRASH_DAYS jours
export async function trashDocuments(ids: string[]): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const batch = db.batch()
  for (const id of ids.slice(0, 500)) batch.update(documents(m.householdId).doc(id), { status: 'trashed', trashedAt: FieldValue.serverTimestamp() })
  await batch.commit().catch(() => null)
  revalidate()
  return { ok: true }
}

// Remis à leur place (à la racine si leur dossier n'existe plus)
export async function restoreDocuments(ids: string[]): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  for (const id of ids.slice(0, 500)) {
    const ref = documents(m.householdId).doc(id)
    const doc = (await ref.get()).data()
    if (!doc || doc.status !== 'trashed') continue
    const folderId = (await folderExists(m.householdId, doc.folderId ?? null)) ? (doc.folderId ?? null) : null
    await ref.update({ status: 'ready', trashedAt: FieldValue.delete(), folderId })
  }
  revalidate()
  return { ok: true }
}

// Supprimés pour de bon (seulement depuis la corbeille)
export async function deleteDocumentsForever(ids: string[]): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const library = await loadLibrary(m.householdId)
  const trashed = new Set(library.trash.map(d => d.id))
  await purgeDocuments(m.householdId, ids.filter(id => trashed.has(id)))
  revalidate()
  return { ok: true }
}

export async function emptyTrash(): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const library = await loadLibrary(m.householdId)
  await purgeDocuments(m.householdId, library.trash.map(d => d.id))
  revalidate()
  return { ok: true }
}

// --- Devis et factures des Travaux ---

// Garde seulement un travail et un artisan qui existent dans ce foyer
async function checkedLink(householdId: string, link: PaperLink): Promise<PaperLink> {
  const household = db.collection('households').doc(householdId)
  const [work, artisan] = await Promise.all([
    link.workId ? household.collection('works').doc(link.workId).get() : null,
    link.artisanId ? household.collection('artisans').doc(link.artisanId).get() : null,
  ])
  return { kind: link.kind, workId: work?.exists ? work.id : null, artisanId: artisan?.exists ? artisan.id : null }
}

// Marque un document comme devis ou facture et le relie (fiche du document, Face ID fait) ;
// link null : redevient un document ordinaire, protégé par Face ID.
export async function setDocumentPaper(id: string, link: PaperLink | null): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const ref = documents(m.householdId).doc(id)
  if (!(await ref.get()).exists) return { ok: false, error: 'Ce document n’existe plus' }
  if (link && !isPaperKind(link.kind)) return { ok: false, error: 'Envoi impossible' }
  const clean = link ? await checkedLink(m.householdId, link) : null
  await ref.update({ paperKind: clean?.kind ?? null, workId: clean?.workId ?? null, artisanId: clean?.artisanId ?? null })
  revalidate()
  return { ok: true }
}

// Depuis Travaux (sans Face ID) : retire un devis ou une facture d'un travail ou d'un artisan.
// Le fichier reste dans Documents.
export async function unlinkPaper(id: string, from: 'work' | 'artisan'): Promise<Result> {
  const m = await member()
  const ref = documents(m.householdId).doc(id)
  const doc = (await ref.get()).data()
  if (!doc || !isPaperKind(doc.paperKind)) return { ok: false, error: 'Ce document n’existe plus' }
  await ref.update(from === 'work' ? { workId: null } : { artisanId: null })
  revalidate()
  return { ok: true }
}

// --- Dossiers (households/{hid}/documentFolders/{id} : name, parentId — null = à la racine) ---

export async function createFolder(parentId: string | null, name: string): Promise<Result<{ id: string }>> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const clean = cleanName(name, 80)
  if (!clean) return { ok: false, error: 'Il faut un nom' }
  if (!(await folderExists(m.householdId, parentId))) return { ok: false, error: 'Ce dossier n’existe plus' }
  const ref = await folders(m.householdId).add({ name: clean, parentId, createdBy: m.user.uid, createdAt: FieldValue.serverTimestamp() })
  revalidate()
  return { ok: true, id: ref.id }
}

export async function renameFolder(id: string, name: string): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const clean = cleanName(name, 80)
  if (!clean) return { ok: false, error: 'Il faut un nom' }
  const ref = folders(m.householdId).doc(id)
  if (!(await ref.get()).exists) return { ok: false, error: 'Ce dossier n’existe plus' }
  await ref.update({ name: clean })
  revalidate()
  return { ok: true }
}

// Rangé dans un autre dossier (null = à la racine), jamais dans lui-même ni dans un de ses sous-dossiers.
// Rend sa nouvelle adresse.
export async function moveFolder(id: string, parentId: string | null): Promise<Result<{ href: string }>> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const library = await loadLibrary(m.householdId)
  const target = parentId ? library.paths.find(p => p.id === parentId) : null
  if (parentId && !target) return { ok: false, error: 'Ce dossier n’existe plus' }
  if (target?.ids.includes(id)) return { ok: false, error: 'Impossible de ranger un dossier dans lui-même' }
  const ref = folders(m.householdId).doc(id)
  if (!(await ref.get()).exists) return { ok: false, error: 'Ce dossier n’existe plus' }
  await ref.update({ parentId })
  revalidate()
  const moved = folderPaths(library.folders.map(f => (f.id === id ? { ...f, parentId } : f))).find(p => p.id === id)
  return { ok: true, href: moved?.href ?? '/documents' }
}

// Seulement un dossier vide (la corbeille ne compte pas) : on ne perd jamais un document en supprimant un dossier
export async function deleteFolder(id: string): Promise<Result> {
  const m = await unlockedMember()
  if (!m) return { ok: false, error: LOCKED }
  const library = await loadLibrary(m.householdId)
  if (library.folders.some(f => f.parentId === id) || library.documents.some(d => d.folderId === id)) {
    return { ok: false, error: 'Le dossier n’est pas vide' }
  }
  await folders(m.householdId).doc(id).delete()
  revalidate()
  return { ok: true }
}
