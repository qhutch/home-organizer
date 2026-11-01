import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import { fetchUpcomingEvents, refreshAccessToken } from '@/lib/google-calendar'
import CalendarWeekView from '@/components/CalendarWeekView'

export default async function CalendarPage() {
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

  if (!connDoc.exists) {
    return (
      <div className="px-4 py-8">
        <h2 className="text-xl font-bold mb-2">Calendrier</h2>
        <p className="text-gray-400 text-sm mb-8">Synchronise un calendrier Google existant avec ton foyer.</p>
        <a
          href={`/api/calendar/auth?householdId=${membership.householdId}`}
          className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-sm">Connecter Google Calendar</p>
            <p className="text-xs text-gray-400 mt-0.5">Synchronise votre calendrier partagé</p>
          </div>
          <span className="ml-auto text-gray-300">›</span>
        </a>
      </div>
    )
  }

  const connection = connDoc.data()!

  if (!connection.calendarId) redirect('/calendar/pick')

  let accessToken = connection.accessToken
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const isExpired = connection.tokenExpiresAt
    ? new Date(connection.tokenExpiresAt) < new Date(now + 5 * 60 * 1000)
    : false

  if (isExpired && connection.refreshToken) {
    const refreshed = await refreshAccessToken(connection.refreshToken)
    if (refreshed) {
      accessToken = refreshed.access_token
      await connDoc.ref.update({
        accessToken: refreshed.access_token,
        tokenExpiresAt: new Date(now + refreshed.expires_in * 1000).toISOString(),
      })
    }
  }

  const events = await fetchUpcomingEvents(accessToken, connection.calendarId)

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Calendrier</h2>
          <p className="text-xs text-gray-400 mt-0.5">{connection.calendarName}</p>
        </div>
        <div className="flex gap-3">
          <a href="/calendar/pick" className="text-xs text-gray-400 hover:text-gray-600">Changer</a>
          <a href={`/api/calendar/auth?householdId=${membership.householdId}`} className="text-xs text-gray-400 hover:text-gray-600">Reconnecter</a>
        </div>
      </div>

      <CalendarWeekView events={events} />
    </div>
  )
}
