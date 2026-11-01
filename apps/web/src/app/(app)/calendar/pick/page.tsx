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
    <div className="px-4 py-8 max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-2">Choisir un calendrier</h2>
      <p className="text-gray-400 text-sm mb-6">Quel calendrier afficher dans l&apos;app ?</p>
      <CalendarPicker
        calendars={calendars}
        householdId={membership.householdId}
      />
    </div>
  )
}
