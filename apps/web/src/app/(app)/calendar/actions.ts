'use server'

import type { CalendarEvent } from '@/lib/google-calendar'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getHouseholdCalendar } from '@/lib/household-calendar'

// Les événements d'une année entière, pour naviguer au-delà des mois chargés avec la page.
export async function loadCalendarYear(year: number): Promise<CalendarEvent[]> {
  const user = await getSessionUser()
  if (!user) return []

  const membership = await getUserHousehold(user.uid)
  if (!membership) return []

  const calendar = await getHouseholdCalendar(membership.householdId, year)
  return calendar.status === 'ok' ? calendar.events : []
}
