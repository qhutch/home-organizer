// Matériel de cuisine des foyers (Réglages › Matériel de cuisine), pour que Claude adapte les recettes.
//   node scripts/kitchen.mjs   → pour chaque foyer : ce qu'il a, ce qu'il n'a pas,
//                                et les recettes qui utilisent du matériel qu'il n'a pas (à adapter)
// Le matériel cité dans les recettes compte comme « on l'a » tant qu'il n'est pas dans « On n'a pas ».
// Lit les identifiants Firebase dans .env.local.
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
process.loadEnvFile(path.join(root, '.env.local'))
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})
const db = getFirestore()

// Mêmes noms simples que l'app (« 3 bols » → Bol)
const { kitchenNames, normalizeKitchen, sameKitchenName } = await import(path.join(root, 'src/lib/recipes/kitchen-names.mjs'))
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// « Friteuse » cochée « on n'a pas » → touche « friteuse » dans une étape
const mentions = (text, name) => new RegExp(`\\b${escape(normalizeKitchen(name))}s?\\b`).test(normalizeKitchen(text))

const households = await db.collection('households').get()
for (const household of households.docs) {
  const kitchen = household.data().kitchen ?? {}
  const have = kitchen.have ?? []
  const missing = kitchen.missing ?? []
  const isMissing = name => missing.some(m => sameKitchenName(m, name))
  const recipes = await household.ref.collection('recipes').get()

  console.log(`\n=== Foyer ${household.data().name ?? household.id} (${household.id})`)
  console.log(`Coché en plus des recettes : ${have.join(', ') || '—'}`)
  console.log(`On n'a pas : ${missing.join(', ') || '—'}`)
  if (!missing.length) continue

  // À adapter : un ustensile dont aucune possibilité n'est là (« Poêle ou casserole » : il en faut une),
  // ou une étape qui cite du matériel qu'on n'a pas
  const toAdapt = []
  for (const d of recipes.docs) {
    const r = d.data()
    const lacking = new Set()
    for (const line of r.equipment ?? []) {
      const options = kitchenNames(line)
      if (options.length && options.every(isMissing)) options.forEach(o => lacking.add(o))
    }
    for (const step of r.steps ?? []) missing.filter(m => mentions(step, m)).forEach(m => lacking.add(m))
    if (lacking.size) toAdapt.push(`- ${household.ref.path}/recipes/${d.id} « ${r.title} » : ${[...lacking].join(', ')}`)
  }
  console.log(`\nRecettes à adapter (${toAdapt.length}) :`)
  toAdapt.forEach(line => console.log(line))
}
process.exit(0)
