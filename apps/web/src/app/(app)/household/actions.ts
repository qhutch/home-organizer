'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function removeMember(memberId: string, householdId: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'Non connecté' }

  const membership = await getUserHousehold(user.uid)
  if (!membership || membership.role !== 'owner') return { error: 'Accès refusé' }
  if (memberId === user.uid) return { error: 'Tu ne peux pas te retirer toi-même' }

  const batch = db.batch()
  batch.delete(db.collection('households').doc(householdId).collection('members').doc(memberId))
  batch.delete(db.collection('userHouseholds').doc(memberId))
  await batch.commit()

  revalidatePath('/household')
  return { success: true }
}

export async function generateInviteLink(householdId: string): Promise<string | null> {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const crypto = await import('crypto')
  const token = crypto.randomBytes(16).toString('hex')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await db
    .collection('invites')
    .doc(token)
    .set({
      householdId,
      createdBy: user.uid,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    })

  return token
}
