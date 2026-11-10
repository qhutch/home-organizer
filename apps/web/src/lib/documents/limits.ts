// Un document est envoyé en morceaux de 3 Mo : un serveur Vercel refuse les envois de plus de 4,5 Mo.
// Chaque morceau est rangé à part (`{foyer}/{document}/{numéro}`), puis recollé à l'ouverture.
export const DOCUMENT_CHUNK_SIZE = 3 * 1024 * 1024
export const DOCUMENT_MAX_SIZE = 100 * 1024 * 1024

export function chunkCount(size: number) {
  return Math.max(1, Math.ceil(size / DOCUMENT_CHUNK_SIZE))
}

// Taille attendue du morceau `index` d'un fichier de `size` octets
export function chunkSize(size: number, index: number) {
  return Math.min(DOCUMENT_CHUNK_SIZE, size - index * DOCUMENT_CHUNK_SIZE)
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}
