// Relit une sauvegarde de la base faite sur le NAS (src/lib/backup) et la remet dans Firestore.
// 1. Télécharger depuis le NAS (File Station) le dossier Hestia-documents/{foyer}/sauvegardes/{jour} (fichiers 0, 1…)
// 2. node scripts/restore-backup.mjs <dossier>              → montre ce qu'elle contient, sans rien écrire
//    node scripts/restore-backup.mjs <dossier> --emulator   → la remet dans la base de test locale (npm run dev lancé)
//    node scripts/restore-backup.mjs <dossier> --real-db    → la remet dans la VRAIE base (écrase les documents du même nom)
// Il faut la clé DOCUMENTS_ENCRYPTION_KEY du serveur (celle de Vercel, pas celle du Mac) : la mettre dans
// BACKUP_KEY=… devant la commande. Sans elle, la sauvegarde est illisible.
import { readdirSync, readFileSync } from 'node:fs'
import { createDecipheriv } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const [folder, mode] = process.argv.slice(2)
if (!folder) {
  console.error('Usage : BACKUP_KEY=… node scripts/restore-backup.mjs <dossier téléchargé> [--emulator | --real-db]')
  process.exit(1)
}
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
try { process.loadEnvFile(path.join(root, '.env.local')) } catch {}
const rawKey = process.env.BACKUP_KEY ?? process.env.DOCUMENTS_ENCRYPTION_KEY
if (!rawKey) { console.error('Pas de clé : BACKUP_KEY=… devant la commande.'); process.exit(1) }

// Morceaux 0, 1, 2… recollés dans l'ordre, puis : vecteur (12) + étiquette (16) + données, étiquette « hestia-backup »
const parts = readdirSync(folder).filter(f => /^\d+$/.test(f)).sort((a, b) => Number(a) - Number(b))
if (!parts.length) { console.error(`Aucun morceau (0, 1…) dans ${folder}`); process.exit(1) }
const file = Buffer.concat(parts.map(p => readFileSync(path.join(folder, p))))
let backup
try {
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(rawKey, 'base64'), file.subarray(0, 12))
  decipher.setAAD(Buffer.from('hestia-backup'))
  decipher.setAuthTag(file.subarray(12, 28))
  backup = JSON.parse(gunzipSync(Buffer.concat([decipher.update(file.subarray(28)), decipher.final()])).toString('utf8'))
} catch {
  console.error('Impossible de lire la sauvegarde : mauvaise clé, ou morceau manquant ou abîmé.')
  process.exit(1)
}

const byCollection = {}
for (const { path: p } of backup.docs) {
  const name = p.split('/').filter((_, i) => i % 2 === 0).at(-1)
  byCollection[name] = (byCollection[name] ?? 0) + 1
}
console.log(`Sauvegarde du ${new Date(backup.createdAt).toLocaleString('fr-FR')} · foyer ${backup.householdId} · ${backup.docs.length} documents`)
for (const [name, n] of Object.entries(byCollection).sort()) console.log(`  ${name} : ${n}`)
if (!mode) process.exit(0)
if (mode !== '--emulator' && mode !== '--real-db') { console.error(`Option inconnue : ${mode}`); process.exit(1) }

const { initializeApp, cert } = await import('firebase-admin/app')
const { getFirestore, Timestamp, GeoPoint } = await import('firebase-admin/firestore')
const project = process.env.FIREBASE_PROJECT_ID
const db = getFirestore(initializeApp({
  projectId: project,
  credential: cert({ projectId: project, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }),
}))
if (mode === '--emulator') db.settings({ host: '127.0.0.1:8080', ssl: false })

// Inverse de encode() dans src/lib/backup/index.ts
function decode(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(decode)
  if ('$ts' in value) return new Timestamp(value.$ts[0], value.$ts[1])
  if ('$bytes' in value) return Buffer.from(value.$bytes, 'base64')
  if ('$ref' in value) return db.doc(value.$ref)
  if ('$geo' in value) return new GeoPoint(value.$geo[0], value.$geo[1])
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]))
}

let batch = db.batch(), n = 0
for (const doc of backup.docs) {
  batch.set(db.doc(doc.path), decode(doc.data))
  if (++n % 200 === 0) { await batch.commit(); batch = db.batch() }
}
await batch.commit()
console.log(`${n} documents remis dans ${mode === '--emulator' ? 'la base de test' : 'la VRAIE base'}.`)
process.exit(0)
