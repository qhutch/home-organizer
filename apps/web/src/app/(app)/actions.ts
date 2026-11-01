'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { FieldValue } from 'firebase-admin/firestore'

export async function getShoppingItems() {
  const user = await getSessionUser()
  if (!user) return []

  const membership = await getUserHousehold(user.uid)
  if (!membership) return []

  const snapshot = await db
    .collection('households')
    .doc(membership.householdId)
    .collection('shoppingItems')
    .orderBy('createdAt', 'desc')
    .get()

  return snapshot.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      name: d.name as string,
      quantity: (d.quantity as number) ?? null,
      unit: (d.unit as string) ?? null,
      notes: (d.notes as string) ?? null,
      inList: d.inList as boolean,
      addedBy: d.addedBy as string,
      createdAt: d.createdAt?.toDate?.().toISOString() ?? '',
    }
  })
}

export async function addShoppingItem(name: string, quantity: number | null, unit: string, notes: string) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  await db
    .collection('households')
    .doc(membership.householdId)
    .collection('shoppingItems')
    .add({
      name: name.trim(),
      quantity: quantity || null,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
      inList: true,
      addedBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
    })

  revalidatePath('/shopping')
}

export async function toggleShoppingItem(itemId: string, inList: boolean) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) return

  await db
    .collection('households')
    .doc(membership.householdId)
    .collection('shoppingItems')
    .doc(itemId)
    .update({ inList })

  revalidatePath('/shopping')
}

export async function deleteShoppingItem(itemId: string) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) return

  await db
    .collection('households')
    .doc(membership.householdId)
    .collection('shoppingItems')
    .doc(itemId)
    .delete()

  revalidatePath('/shopping')
}
