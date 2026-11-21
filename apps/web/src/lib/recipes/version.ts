import { db } from '@/lib/firebase/admin'

// Numéro de version des recettes du foyer (`households/{hid}.recipesChangedAt`, en millisecondes), changé à
// chaque modification d'une recette. La liste des recettes est gardée en cache sous ce numéro (getRecipes) :
// chaque page ne coûte qu'une lecture tant que rien ne change, au lieu d'une par recette (quota de Firestore).
// Un script qui écrit dans une recette hors de l'app doit aussi le changer, sinon l'app garde l'ancienne liste.
const ref = (householdId: string) => db.collection('households').doc(householdId)

export async function markRecipesChanged(householdId: string) {
  await ref(householdId).set({ recipesChangedAt: Date.now() }, { merge: true })
}

export async function recipesVersion(householdId: string): Promise<number> {
  const value = (await ref(householdId).get()).data()?.recipesChangedAt
  return typeof value === 'number' ? value : 0
}
