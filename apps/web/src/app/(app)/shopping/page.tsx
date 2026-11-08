import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import ShoppingList from '@/components/ShoppingList'
import { getItemMemory, getShoppingItems } from '../actions'

export default async function ShoppingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [initialItems, initialMemory] = await Promise.all([getShoppingItems(), getItemMemory()])

  return <ShoppingList initialItems={initialItems} initialMemory={initialMemory} />
}
