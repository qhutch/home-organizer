'use client'

import { DOCUMENT_CHUNK_SIZE, chunkCount } from '@/lib/documents/limits'
import { makeThumbnail } from '@/lib/documents/thumbnail'
import { cancelDocumentUpload, finishDocumentUpload, startDocumentUpload, uploadDocumentChunk, type Duplicate, type PaperLink } from '@/app/(app)/documents/actions'

export type UploadResult = { ok: true; href: string } | { ok: false; error: string; duplicate?: Duplicate }

// Empreinte SHA-256 du fichier (en hexadécimal), pour repérer un document déjà rangé
async function hashFile(file: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

// Envoie un fichier dans un dossier : empreinte, morceaux de 3 Mo, puis l'aperçu.
// force : l'ajouter même s'il est déjà rangé.
// paper : un devis ou une facture envoyé depuis Travaux (sans Face ID, dans « Maison › Devis et Factures »).
export async function uploadDocument(
  file: File,
  folderId: string | null,
  { force = false, onProgress, paper = null }: { force?: boolean; onProgress?: (progress: number) => void; paper?: PaperLink | null } = {},
): Promise<UploadResult> {
  const [sha256, thumb] = await Promise.all([hashFile(file), makeThumbnail(file)])
  const start = await startDocumentUpload({ name: file.name, type: file.type, size: file.size, sha256 }, folderId, force, paper)
  if (!start.ok) return start

  try {
    const chunks = chunkCount(file.size)
    for (let index = 0; index < chunks; index++) {
      const form = new FormData()
      form.set('id', start.id)
      form.set('index', String(index))
      form.set('chunk', file.slice(index * DOCUMENT_CHUNK_SIZE, (index + 1) * DOCUMENT_CHUNK_SIZE))
      const res = await uploadDocumentChunk(form)
      if (!res.ok) throw new Error(res.error)
      onProgress?.((index + 1) / chunks)
    }
    const form = new FormData()
    form.set('id', start.id)
    if (thumb) form.set('thumb', thumb)
    const done = await finishDocumentUpload(form)
    if (!done.ok) throw new Error(done.error)
    return done
  } catch (err) {
    void cancelDocumentUpload(start.id)
    return { ok: false, error: err instanceof Error ? err.message : 'Envoi impossible' }
  }
}
