import { redirect } from 'next/navigation'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { loadKitchen } from '@/lib/recipes/kitchen'
import KitchenEquipment from './KitchenEquipment'

// Matériel de cuisine du foyer (ouvert depuis Réglages) : on coche ce qu'on a.
// Claude s'en sert pour adapter les recettes au matériel du foyer.
export default async function KitchenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const items = await loadKitchen(membership.householdId)

  return (
    <div className="page-wrap max-w-xl pb-28">
      <h1 className="text-4xl mb-1">Matériel de cuisine</h1>
      <KitchenEquipment initialItems={items} />
    </div>
  )
}
