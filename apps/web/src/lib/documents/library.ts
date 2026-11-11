import { db } from '@/lib/firebase/admin'
import type { DocumentFolder, HouseholdDocument, PaperKind } from '@/types/database'

export const ROOT_LABEL = 'Documents'
// Une date d'expiration s'affiche « à renouveler » ce nombre de jours avant
export const EXPIRY_WARNING_DAYS = 60
export const TRASH_DAYS = 30

// Devis et factures des Travaux : rangés dans Documents, mais ouverts sans Face ID
export function isPaperKind(value: unknown): value is PaperKind {
  return value === 'quote' || value === 'invoice'
}

export type FolderPath = { id: string; parentId: string | null; label: string; href: string; ids: string[] }

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
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

const iso = (value: { toDate?: () => Date } | undefined) => value?.toDate?.().toISOString() ?? null

// Tous les dossiers et documents d'un foyer (un foyer en a peu : on lit tout, puis on trie ici).
export async function loadLibrary(householdId: string) {
  const household = db.collection('households').doc(householdId)
  const [folderSnap, documentSnap] = await Promise.all([
    household.collection('documentFolders').orderBy('name').get(),
    household.collection('documents').orderBy('createdAt', 'desc').get(),
  ])

  const folders: DocumentFolder[] = folderSnap.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name as string,
    parentId: (doc.data().parentId as string | null) ?? null,
  }))
  const paths = folderPaths(folders)
  const pathById = new Map(paths.map(p => [p.id, p]))

  const all: HouseholdDocument[] = documentSnap.docs
    .filter(doc => ['ready', 'trashed'].includes(doc.data().status))
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
        expiresOn: (d.expiresOn as string | null) ?? null,
        trashedAt: d.status === 'trashed' ? iso(d.trashedAt) : null,
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

// Jours avant l'expiration (négatif : déjà expiré)
export function daysUntil(date: string, now = new Date()) {
  const [y, m, d] = date.split('-').map(Number)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000)
}

export function toRenew(documents: HouseholdDocument[]) {
  return documents
    .filter(d => d.expiresOn && daysUntil(d.expiresOn) <= EXPIRY_WARNING_DAYS)
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!))
}

// Pour l'accueil : le nombre de documents et de documents à renouveler (des chiffres seulement, rien de lisible sans Face ID)
export async function documentsAtGlance(householdId: string) {
  const snap = await db.collection('households').doc(householdId).collection('documents').where('status', '==', 'ready').get()
  const toRenewCount = snap.docs.filter(doc => {
    const date = doc.data().expiresOn as string | null | undefined
    return date && daysUntil(date) <= EXPIRY_WARNING_DAYS
  }).length
  return { count: snap.size, toRenew: toRenewCount }
}
