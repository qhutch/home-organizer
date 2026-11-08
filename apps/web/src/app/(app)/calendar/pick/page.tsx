import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import CalendarPicker from './CalendarPicker'

export default async function CalendarPickPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const connDoc = await db
    .collection('households')
    .doc(membership.householdId)
    .collection('calendarConnections')
    .doc('main')
    .get()

  if (!connDoc.exists) redirect('/calendar')

  const connection = connDoc.data()!

  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${connection.accessToken}` },
  })
  const data = await res.json()
  const calendars: { id: string; summary: string; primary?: boolean; backgroundColor?: string }[] = data.items ?? []

  return (
    <div className="page-wrap max-w-sm">
      <h1 className="text-4xl mb-2">Choisir un calendrier</h1>
      <p className="text-ink-muted text-sm mb-6">Quel calendrier afficher dans l&apos;app ?</p>
      <CalendarPicker calendars={calendars} />
    </div>
  )
}
