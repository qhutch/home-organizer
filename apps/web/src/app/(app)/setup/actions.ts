'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import { FieldValue } from 'firebase-admin/firestore'

export async function createHousehold(formData: FormData): Promise<{ error: string } | undefined> {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Nom requis' }

  // Check not already in a household
  const existing = await db.collection('userHouseholds').doc(user.uid).get()
  if (existing.exists) redirect('/')

  const householdRef = db.collection('households').doc()
  const batch = db.batch()

  batch.set(householdRef, { name, createdAt: FieldValue.serverTimestamp() })
  batch.set(householdRef.collection('members').doc(user.uid), {
    role: 'owner',
    joinedAt: FieldValue.serverTimestamp(),
  })
  batch.set(db.collection('userHouseholds').doc(user.uid), {
    householdId: householdRef.id,
    role: 'owner',
  })

  await batch.commit()
  redirect('/')
}
