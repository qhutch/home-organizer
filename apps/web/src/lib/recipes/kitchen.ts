import { db } from '@/lib/firebase/admin'
import { KITCHEN_CATALOG, kitchenGroup, kitchenNames, sameKitchenName, type KitchenGroup } from '@/lib/recipes/kitchen-names.mjs'

// Le matériel de cuisine du foyer (page /settings/materiel), dans households/{hid}.kitchen, en noms simples
// (« Bol », pas « 3 bols », voir kitchen-names.mjs) : have = ce qu'on a, missing = ce qu'on n'a pas.
// Un ustensile cité dans les recettes compte comme « on l'a » tant qu'il n'est pas dans missing ;
// un ustensile du catalogue que les recettes ne citent pas, seulement s'il est dans have.
// Claude s'en sert pour adapter les recettes (scripts/kitchen.mjs).
export type KitchenItem = { name: string; group: KitchenGroup; have: boolean }

const MAX_LENGTH = 40

export function cleanKitchenName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH)
  if (!name) return null
  return kitchenNames(name)[0] ?? null
}

function names(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const result: string[] = []
  for (const value of list) {
    if (typeof value === 'string' && !result.some(n => sameKitchenName(n, value))) result.push(value)
  }
  return result
}

export async function loadKitchen(householdId: string): Promise<KitchenItem[]> {
  const ref = db.collection('households').doc(householdId)
  const [household, recipes] = await Promise.all([ref.get(), ref.collection('recipes').select('equipment').get()])
  const kitchen = household.data()?.kitchen
  const have = names(kitchen?.have)
  const missing = names(kitchen?.missing)
  const cited = names(recipes.docs.flatMap(doc => {
    const equipment = doc.data().equipment
    return Array.isArray(equipment) ? equipment.filter((e): e is string => typeof e === 'string').flatMap(kitchenNames) : []
  }))
  const all = names([...KITCHEN_CATALOG.map(([name]) => name), ...cited, ...have, ...missing])
  const has = (list: string[], name: string) => list.some(n => sameKitchenName(n, name))
  return all
    .map(name => ({
      name,
      group: kitchenGroup(name),
      have: has(have, name) || (has(cited, name) && !has(missing, name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}
