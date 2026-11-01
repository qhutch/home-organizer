'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function selectCalendar(calendarId: string, calendarName: string) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  await db
    .collection('households')
    .doc(membership.householdId)
    .collection('calendarConnections')
    .doc('main')
    .update({ calendarId, calendarName })

  revalidatePath('/calendar')
  redirect('/calendar')
}
