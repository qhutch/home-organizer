import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import { getHouseholdCalendar } from '@/lib/household-calendar'
import CalendarView from '@/components/CalendarView'
import PageHeader from '@/components/ui/PageHeader'

export default async function CalendarPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const calendar = await getHouseholdCalendar(membership.householdId)

  if (calendar.status === 'not-connected') {
    return (
      <div className="page-wrap">
        <PageHeader feature="calendar" />
        <div className="card flex flex-col items-start gap-4">
          <p className="text-sm">Reliez un agenda Google existant pour voir vos événements communs ici et sur l’accueil.</p>
          <a href={`/api/calendar/auth?householdId=${membership.householdId}`} className="btn">
            Connecter Google Agenda
          </a>
        </div>
      </div>
    )
  }

  if (calendar.status === 'no-calendar') redirect('/calendar/pick')

  return (
    <div className="page-wrap">
      <PageHeader feature="calendar" />

      <CalendarView events={calendar.events} />
    </div>
  )
}
