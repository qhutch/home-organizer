export type CalendarEvent = {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  description?: string
  colorId?: string
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) return null
  return data
}

export async function fetchUpcomingEvents(accessToken: string, calendarId: string): Promise<CalendarEvent[]> {
  // Fetch from start of current week to 4 weeks ahead
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const maxTime = new Date(monday)
  maxTime.setDate(monday.getDate() + 28)

  const params = new URLSearchParams({
    timeMin: monday.toISOString(),
    timeMax: maxTime.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 0 } }
  )

  if (!res.ok) return []
  const data = await res.json()
  return data.items ?? []
}

export function formatEventDate(event: CalendarEvent): string {
  const start = event.start.dateTime ?? event.start.date
  if (!start) return ''

  const date = new Date(start)
  const isAllDay = !event.start.dateTime

  if (isAllDay) {
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export function isToday(event: CalendarEvent): boolean {
  const start = event.start.dateTime ?? event.start.date
  if (!start) return false
  const date = new Date(start)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}
