import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import ShoppingList from '@/components/ShoppingList'
import { getItemMemory, getShoppingItems } from '../actions'
import { getPlannedRecipes } from '../recipes/actions'

export default async function ShoppingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [initialItems, initialMemory, planned] = await Promise.all([getShoppingItems(), getItemMemory(), getPlannedRecipes()])

  return <ShoppingList initialItems={initialItems} initialMemory={initialMemory} planned={planned} />
}
