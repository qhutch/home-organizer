import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import ShoppingList from '@/components/ShoppingList'

export default async function ShoppingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const snapshot = await db
    .collection('households')
    .doc(membership.householdId)
    .collection('shoppingItems')
    .orderBy('createdAt', 'desc')
    .get()

  const initialItems = snapshot.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      name: d.name as string,
      notes: d.notes as string | null,
      inList: d.inList as boolean,
      addedBy: d.addedBy as string,
      createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    }
  })

  return <ShoppingList householdId={membership.householdId} userId={user.uid} initialItems={initialItems} />
}
