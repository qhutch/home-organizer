import { db } from '@/lib/firebase/admin'
import type { DocumentFolder, HouseholdDocument, PaperKind } from '@/types/database'

export const ROOT_LABEL = 'Documents'
export const TRASH_DAYS = 30

// Devis et factures des Travaux : rangés dans Documents, mais ouverts sans Face ID
export function isPaperKind(value: unknown): value is PaperKind {
  return value === 'quote' || value === 'invoice'
}

// privateTo : le membre qui seul voit ce dossier, réglé sur lui ou sur un dossier qui le contient (null = tout le foyer)
export type FolderPath = { id: string; parentId: string | null; label: string; href: string; ids: string[]; privateTo: string | null }

// Chaque dossier avec son chemin complet (« Maison › Assurances ») et son adresse
export function folderPaths(folders: DocumentFolder[]): FolderPath[] {
  const byId = new Map(folders.map(f => [f.id, f]))
  function pathOf(folder: DocumentFolder, seen = new Set<string>()): DocumentFolder[] {
    const parent = folder.parentId ? byId.get(folder.parentId) : undefined
    // Garde-fou : un dossier rangé dans lui-même ne doit pas faire tourner en rond
    if (!parent || seen.has(parent.id)) return [folder]
    seen.add(folder.id)
    return [...pathOf(parent, seen), folder]
  }
  return folders
    .map(f => {
      const path = pathOf(f)
      return {
        id: f.id,
        parentId: f.parentId,
        label: path.map(p => p.name).join(' › '),
        href: `/documents/${path.map(p => p.id).join('/')}`,
        ids: path.map(p => p.id),
        privateTo: path.find(p => p.privateTo)?.privateTo ?? null,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

const iso = (value: { toDate?: () => Date } | undefined) => value?.toDate?.().toISOString() ?? null

async function readFolders(householdId: string): Promise<DocumentFolder[]> {
  const snap = await db.collection('households').doc(householdId).collection('documentFolders').orderBy('name').get()
  return snap.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name as string,
    parentId: (doc.data().parentId as string | null) ?? null,
    privateTo: (doc.data().privateTo as string | null) ?? null,
    createdBy: (doc.data().createdBy as string | null) ?? null,
  }))
}

// Ce qu'un membre a le droit de voir : (folderId) => true pour un dossier qu'il voit ou la racine.
// Un document dont le dossier n'existe plus est à la racine, donc visible.
export async function folderAccess(householdId: string, uid: string) {
  const paths = folderPaths(await readFolders(householdId))
  const hidden = new Set(paths.filter(p => p.privateTo && p.privateTo !== uid).map(p => p.id))
  return (folderId: string | null | undefined) => !folderId || !hidden.has(folderId)
}

// Un document (ses infos Firestore) que ce membre voit : ni privé pour un autre, ni dans un dossier privé d'un autre
export function canSeeDocument(canSeeFolder: (folderId: string | null | undefined) => boolean, uid: string, data: FirebaseFirestore.DocumentData) {
  return (!data.privateTo || data.privateTo === uid) && canSeeFolder(data.folderId)
}

export async function documentAccess(householdId: string, uid: string) {
  const canSeeFolder = await folderAccess(householdId, uid)
  return (data: FirebaseFirestore.DocumentData) => canSeeDocument(canSeeFolder, uid, data)
}

// Les dossiers et documents d'un foyer que ce membre voit (un foyer en a peu : on lit tout, puis on trie ici).
// Les dossiers et documents privés d'un autre membre, et ce que ces dossiers contiennent, n'y sont pas.
// allFolders, allPathById et hiddenDocuments servent seulement aux vérifications côté serveur : ne jamais les envoyer au navigateur.
export async function loadLibrary(householdId: string, uid: string) {
  const household = db.collection('households').doc(householdId)
  const [allFolders, documentSnap] = await Promise.all([
    readFolders(householdId),
    household.collection('documents').orderBy('createdAt', 'desc').get(),
  ])

  const allPaths = folderPaths(allFolders)
  const allPathById = new Map(allPaths.map(p => [p.id, p]))
  const hidden = new Set(allPaths.filter(p => p.privateTo && p.privateTo !== uid).map(p => p.id))
  const folders = allFolders.filter(f => !hidden.has(f.id))
  const paths = allPaths.filter(p => !hidden.has(p.id))
  const pathById = new Map(paths.map(p => [p.id, p]))

  const kept = documentSnap.docs.filter(doc => ['ready', 'trashed'].includes(doc.data().status))
  const canSee = (data: FirebaseFirestore.DocumentData) => canSeeDocument(id => !id || !hidden.has(id), uid, data)
  // Ceux qu'on ne voit pas : seulement où ils sont et à qui, pour les vérifications
  const hiddenDocuments = kept
    .filter(doc => !canSee(doc.data()))
    .map(doc => ({ id: doc.id, folderId: (doc.data().folderId as string | null) ?? null, addedBy: doc.data().addedBy as string }))

  const all: HouseholdDocument[] = kept
    .filter(doc => canSee(doc.data()))
    .map(doc => {
      const d = doc.data()
      const folder = d.folderId ? pathById.get(d.folderId as string) : undefined
      return {
        id: doc.id,
        name: d.name as string,
        mimeType: d.mimeType as string,
        size: d.size as number,
        folderId: folder ? folder.id : null,
        addedBy: d.addedBy as string,
        createdAt: iso(d.createdAt) ?? '',
        lastOpenedAt: iso(d.lastOpenedAt),
        hasThumb: Boolean(d.hasThumb),
        trashedAt: d.status === 'trashed' ? iso(d.trashedAt) : null,
        privateTo: (d.privateTo as string | null) ?? null,
        inPrivateFolder: Boolean(folder?.privateTo),
        paperKind: isPaperKind(d.paperKind) ? d.paperKind : null,
        workId: (d.workId as string | null) ?? null,
        artisanId: (d.artisanId as string | null) ?? null,
        href: `${folder ? folder.href : '/documents'}/${doc.id}`,
        place: folder ? folder.label : ROOT_LABEL,
      }
    })

  return {
    folders,
    paths,
    allFolders,
    allPathById,
    hiddenDocuments,
    documents: all.filter(d => !d.trashedAt),
    trash: all.filter(d => d.trashedAt),
  }
}

// Le chemin de l'adresse (/documents/{id}/{id}…) : chaque dossier doit être dans le précédent.
// Rend la suite des dossiers, ou null si le chemin ne correspond à rien.
export function resolveTrail(folders: DocumentFolder[], path: string[]) {
  const byId = new Map(folders.map(f => [f.id, f]))
  const trail: DocumentFolder[] = []
  let parentId: string | null = null
  for (const id of path) {
    const folder = byId.get(id)
    if (!folder || folder.parentId !== parentId) return null
    trail.push(folder)
    parentId = folder.id
  }
  return trail
}

// Pour l'accueil : le nombre de documents (un chiffre seulement, rien de lisible sans Face ID),
// sans les documents privés d'un autre membre
export async function documentsAtGlance(householdId: string, uid: string) {
  const [snap, canSee] = await Promise.all([
    db.collection('households').doc(householdId).collection('documents').where('status', '==', 'ready').get(),
    documentAccess(householdId, uid),
  ])
  const docs = snap.docs.filter(doc => canSee(doc.data()))
  return { count: docs.length }
}
