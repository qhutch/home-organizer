import { db } from '@/lib/firebase/admin'

// Numéro de version de la liste de courses du foyer (`households/{hid}.shoppingChangedAt`, en millisecondes),
// changé à chaque modification. La liste ouverte le relit toutes les 30 s (1 lecture) et ne recharge
// tous les articles que s'il a changé : relire toute la liste à chaque fois épuisait le quota de Firestore.
// `previous` : la version juste avant ce changement. Si la liste affichée l'avait, rien d'autre n'a bougé
// entre-temps : elle prend la nouvelle version sans tout recharger.
export type ShoppingChange = { previous: number; version: number }

const ref = (householdId: string) => db.collection('households').doc(householdId)
const read = (value: unknown) => (typeof value === 'number' ? value : 0)

export async function markShoppingChanged(householdId: string): Promise<ShoppingChange> {
  return db.runTransaction(async t => {
    const previous = read((await t.get(ref(householdId))).data()?.shoppingChangedAt)
    const version = Math.max(Date.now(), previous + 1)
    t.set(ref(householdId), { shoppingChangedAt: version }, { merge: true })
    return { previous, version }
  })
}

export async function shoppingVersion(householdId: string): Promise<number> {
  return read((await ref(householdId).get()).data()?.shoppingChangedAt)
}
