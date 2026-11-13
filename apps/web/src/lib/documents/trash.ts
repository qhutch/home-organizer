import { db } from '@/lib/firebase/admin'
import { documentStorage } from '@/lib/documents/storage'
import { TRASH_DAYS } from '@/lib/documents/library'

// Efface pour de bon des documents (fichier, aperçu et infos) ; rend ceux qui sont vraiment partis
export async function purgeDocuments(householdId: string, ids: string[]) {
  const storage = await documentStorage(householdId)
  const purged: string[] = []
  for (const id of ids) {
    // NAS injoignable : on garde le document, on réessaiera à la prochaine ouverture
    try {
      await storage?.removeAll(`${householdId}/${id}`)
    } catch {
      continue
    }
    await db.collection('households').doc(householdId).collection('documents').doc(id).delete()
    purged.push(id)
  }
  return purged
}

// À l'ouverture de l'onglet : vide ce qui est à la corbeille depuis plus de TRASH_DAYS jours
export async function purgeOldTrash(householdId: string, trash: { id: string; trashedAt: string | null }[]) {
  const limit = Date.now() - TRASH_DAYS * 86400000
  const old = trash.filter(d => d.trashedAt && Date.parse(d.trashedAt) < limit).map(d => d.id)
  return old.length ? purgeDocuments(householdId, old) : ([] as string[])
}

// Jours qu'il reste avant qu'un document de la corbeille disparaisse
export function trashDaysLeft(trashedAt: string | null) {
  if (!trashedAt) return TRASH_DAYS
  return Math.max(0, TRASH_DAYS - Math.floor((Date.now() - Date.parse(trashedAt)) / 86400000))
}
