'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import { FieldValue } from 'firebase-admin/firestore'

export async function joinHousehold(householdId: string, token: string) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const inviteDoc = await db.collection('invites').doc(token).get()
  if (!inviteDoc.exists) return { error: 'Invitation invalide' }
  const invite = inviteDoc.data()!
  if (new Date(invite.expiresAt) < new Date()) return { error: 'Invitation expirée' }

  const batch = db.batch()
  batch.set(
    db.collection('households').doc(householdId).collection('members').doc(user.uid),
    { role: 'member', joinedAt: FieldValue.serverTimestamp() }
  )
  batch.set(db.collection('userHouseholds').doc(user.uid), {
    householdId,
    role: 'member',
  })
  await batch.commit()

  redirect('/')
}
