import { db } from '@/lib/firebase/admin'

// Numéro de version de la liste de courses du foyer (`households/{hid}.shoppingChangedAt`, en millisecondes),
// changé à chaque modification. La liste ouverte le relit toutes les 30 s (1 lecture) et ne recharge
// tous les articles que s'il a changé : relire toute la liste à chaque fois épuisait le quota de Firestore.
export async function markShoppingChanged(householdId: string) {
  await db.collection('households').doc(householdId).set({ shoppingChangedAt: Date.now() }, { merge: true })
}

export async function shoppingVersion(householdId: string): Promise<number> {
  const d = (await db.collection('households').doc(householdId).get()).data()
  return typeof d?.shoppingChangedAt === 'number' ? d.shoppingChangedAt : 0
}
