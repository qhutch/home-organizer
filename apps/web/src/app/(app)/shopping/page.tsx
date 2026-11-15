import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import ShoppingList from '@/components/ShoppingList'
import { getItemMemory, getShoppingItems, getShoppingVersion } from '../actions'
import { getPlannedRecipes } from '../recipes/actions'

export default async function ShoppingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  // La version d'abord : un changement fait pendant le chargement sera repris au prochain rafraîchissement
  const version = await getShoppingVersion()
  const [initialItems, initialMemory, planned] = await Promise.all([getShoppingItems(), getItemMemory(), getPlannedRecipes()])

  return <ShoppingList version={version} initialItems={initialItems} initialMemory={initialMemory} planned={planned} />
}
