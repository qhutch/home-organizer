// Base de test locale : en dev, Hestia lit et écrit dans l'émulateur Firestore (sur le Mac), plus dans la vraie base.
// Sinon chaque rechargement pendant le développement consomme le quota gratuit de la vraie base (50 000 lectures
// par jour) : le 15 nov. 2026, Hestia est tombée en panne pour toute la soirée.
//   node scripts/dev-db.mjs          → lance l'émulateur puis Next (= npm run dev). Les données sont gardées dans .firebase-dev/
//   node scripts/dev-db.mjs copy     → recopie la vraie base dans la base de test (émulateur lancé à part, voir plus bas).
//                                       À refaire quand on veut des données fraîches : ça lit toute la vraie base une fois.
// Il faut Java (brew install openjdk@21). La connexion (Firebase Auth) reste la vraie : on se connecte comme d'habitude.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
process.loadEnvFile(path.join(root, '.env.local'))
const project = process.env.FIREBASE_PROJECT_ID
const DATA = path.join(root, '.firebase-dev')
const HOST = '127.0.0.1:8080'
const JAVA = '/opt/homebrew/opt/openjdk@21/bin'
const env = { ...process.env, PATH: `${JAVA}:${process.env.PATH}` }
// Pas dans les dépendances du projet (Vercel n'en a pas besoin) : npx le télécharge la première fois

if (process.argv[2] === 'copy') {
  await copy()
} else {
  // emulators:exec passe FIRESTORE_EMULATOR_HOST à Next : firebase-admin écrit alors dans l'émulateur
  const args = ['emulators:exec', '--only', 'firestore', '--project', project, '--export-on-exit', DATA]
  if (existsSync(path.join(DATA, 'firebase-export-metadata.json'))) args.push('--import', DATA)
  else console.log('\nBase de test vide : lancer `npm run dev:copy` pour y recopier la vraie base.\n')
  args.push('next dev')
  spawn('npx', ['--yes', 'firebase-tools@14', ...args], { cwd: root, env, stdio: 'inherit' }).on('exit', code => process.exit(code ?? 0))
}

async function copy() {
  const { initializeApp, cert } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')
  const credential = cert({ projectId: project, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') })
  const prod = getFirestore(initializeApp({ credential }, 'prod'))
  const dev = getFirestore(initializeApp({ credential, projectId: project }, 'dev'))
  dev.settings({ host: HOST, ssl: false })

  try { await dev.listCollections() } catch {
    console.error(`L'émulateur ne répond pas sur ${HOST} : lancer d'abord \`npm run dev\` dans un autre terminal.`)
    process.exit(1)
  }
  let count = 0
  async function copyCollection(ref) {
    const snap = await ref.get()
    let batch = dev.batch(), inBatch = 0
    for (const doc of snap.docs) {
      batch.set(dev.doc(doc.ref.path), doc.data())
      count++
      if (++inBatch === 200) { await batch.commit(); batch = dev.batch(); inBatch = 0 }
    }
    if (inBatch) await batch.commit()
    // Sous-collections, y compris celles d'un document qui n'existe pas lui-même
    for (const doc of await ref.listDocuments()) for (const sub of await doc.listCollections()) await copyCollection(sub)
  }
  for (const collection of await prod.listCollections()) await copyCollection(collection)
  console.log(`${count} documents recopiés dans la base de test.`)
  process.exit(0)
}
