// Retours laissés dans Hestia (Réglages › Retours), pour Claude.
//   node scripts/feedback.mjs                       → les retours en attente, de tous les foyers
//   node scripts/feedback.mjs done <chemin> "<réponse>" → marque un retour traité, avec la réponse affichée dans l'app
// Lit les identifiants Firebase dans .env.local. Lancé au début de chaque session par le hook SessionStart (.claude/settings.json).
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
try { process.loadEnvFile(path.join(root, '.env.local')) } catch {
  console.log('Retours Hestia : .env.local introuvable, impossible de les lire.')
  process.exit(0)
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})
const db = getFirestore()

const [cmd, docPath, ...rest] = process.argv.slice(2)

if (cmd === 'done') {
  const reply = rest.join(' ').trim()
  if (!docPath || !docPath.includes('/feedback/')) {
    console.error('Usage : node scripts/feedback.mjs done households/<hid>/feedback/<id> "réponse"')
    process.exit(1)
  }
  await db.doc(docPath).update({ status: 'done', reply: reply || null, doneAt: FieldValue.serverTimestamp() })
  console.log(`Retour ${docPath} marqué traité.`)
  process.exit(0)
}

const snap = await db.collectionGroup('feedback').get()
const pending = snap.docs.filter(d => d.data().status !== 'done')
  .sort((a, b) => a.data().createdAt.toMillis() - b.data().createdAt.toMillis())

if (!pending.length) {
  console.log('Retours Hestia : aucun retour en attente.')
  process.exit(0)
}

const names = new Map()
async function nameOf(uid) {
  if (!names.has(uid)) names.set(uid, (await db.collection('userProfiles').doc(uid).get()).data()?.displayName ?? uid)
  return names.get(uid)
}

console.log(`Retours Hestia en attente (${pending.length}) — à traiter en premier, puis marquer chacun traité avec \`node apps/web/scripts/feedback.mjs done <chemin> "réponse courte"\` :\n`)
for (const d of pending) {
  const x = d.data()
  const date = x.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  console.log(`- [${d.ref.path}] ${await nameOf(x.createdBy)}, ${date} :\n  ${x.text.replace(/\n/g, '\n  ')}\n`)
}
process.exit(0)
