import { db } from '@/lib/firebase/admin'
import { fetchUpcomingEvents, refreshAccessToken, type CalendarEvent } from '@/lib/google-calendar'

export type HouseholdCalendar =
  | { status: 'not-connected' }
  | { status: 'no-calendar' }
  | { status: 'ok'; calendarName: string | null; events: CalendarEvent[] }

// Charge l'agenda Google relié au foyer, en renouvelant le jeton d'accès s'il expire.
export async function getHouseholdCalendar(householdId: string, year?: number): Promise<HouseholdCalendar> {
  const connDoc = await db
    .collection('households')
    .doc(householdId)
    .collection('calendarConnections')
    .doc('main')
    .get()

  if (!connDoc.exists) return { status: 'not-connected' }

  const connection = connDoc.data()!
  if (!connection.calendarId) return { status: 'no-calendar' }

  let accessToken = connection.accessToken
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

  const events = await fetchUpcomingEvents(accessToken, connection.calendarId, year)
  return { status: 'ok', calendarName: connection.calendarName ?? null, events }
}
