import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { getHouseholdCalendar } from '@/lib/household-calendar'
import type { CalendarEvent } from '@/lib/google-calendar'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FEATURES, type FeatureId } from '@/lib/ui/features'
import FeatureArt from '@/components/ui/FeatureArt'
import HomeDate from '@/components/ui/HomeDate'

const TIME_ZONE = 'Europe/Paris'

function dayKey(date: Date) {
  return date.toLocaleDateString('fr-FR', { timeZone: TIME_ZONE })
}

// Prochain événement pas encore terminé (la date de fin d'un événement sur la journée est exclusive).
function nextEvent(events: CalendarEvent[], now: Date) {
  return events.find(e => {
    const end = e.end.dateTime ?? e.end.date
    return end ? new Date(end) > now : false
  }) ?? null
}

function eventWhen(event: CalendarEvent, now: Date) {
  const start = new Date(event.start.dateTime ?? event.start.date ?? '')
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const day = dayKey(start) === dayKey(now)
    ? 'Aujourd’hui'
    : dayKey(start) === dayKey(tomorrow)
      ? 'Demain'
      : start.toLocaleDateString('fr-FR', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' })
  const time = event.start.dateTime
    ? start.toLocaleTimeString('fr-FR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })
    : 'Journée'
  return { day, time }
}

// Toutes les cartes suivent la même grille : titre en haut, détail en bas, grande icône au fond.
// Le chiffre clé et son libellé forment un seul bloc à droite, sur toute la hauteur.
function HomeTile({ feature, stat, statLabel, className = '', children }: {
  feature: FeatureId
  stat?: React.ReactNode
  statLabel?: string
  className?: string
  children: React.ReactNode
}) {
  const { href, label, fill } = FEATURES[feature]
  return (
    <Link href={href} className={`tile ${fill} ${className} relative overflow-hidden !flex items-stretch justify-between gap-4`}>
      <FeatureArt feature={feature} />
      <div className="relative flex flex-col justify-between gap-4 min-w-0 flex-1">
        <p className="tile-title min-w-0">{label}</p>
        <div className="text-sm min-w-0">{children}</div>
      </div>
      {stat !== undefined && (
        <div className="relative text-right shrink-0">
          <p className="big-number">{stat}</p>
          <p className="text-sm font-medium mt-1">{statLabel}</p>
        </div>
      )}
    </Link>
  )
}

// Sur une demi-carte, le chiffre clé passe sous le titre (pas la place à côté).
function HalfStat({ value, label }: { value: number; label: string }) {
  return (
    <>
      <p className="big-number">{value}</p>
      <p className="font-medium mt-1">{label}</p>
    </>
  )
}

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const household = db.collection('households').doc(membership.householdId)
  const [shoppingSnap, recipesSnap, calendar] = await Promise.all([
    household.collection('shoppingItems').where('inList', '==', true).count().get(),
    household.collection('recipes').count().get(),
    getHouseholdCalendar(membership.householdId).catch(() => null),
  ])

  const shoppingCount = shoppingSnap.data().count
  const recipesCount = recipesSnap.data().count

  const now = new Date()
  const event = calendar?.status === 'ok' ? nextEvent(calendar.events, now) : null
  const when = event ? eventWhen(event, now) : null

  return (
    <div className="page-wrap">
      <HomeDate />

      <div className="flex flex-col gap-2">
        <HomeTile feature="calendar">
          {event && when ? (
            <div className="card-inset flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display font-semibold text-2xl leading-tight tracking-tight">{when.time}</p>
                <p className="truncate">{event.summary}</p>
              </div>
              <p className="font-medium shrink-0">{when.day}</p>
            </div>
          ) : (
            <p>{calendar?.status === 'ok' ? 'Rien de prévu ces prochaines semaines' : 'Relier votre agenda Google'}</p>
          )}
        </HomeTile>

        <div className="grid grid-cols-2 gap-2">
          <HomeTile feature="shopping" className="min-h-44">
            <HalfStat value={shoppingCount} label={`article${shoppingCount > 1 ? 's' : ''}`} />
          </HomeTile>
          <HomeTile feature="recipes" className="min-h-44">
            <HalfStat value={recipesCount} label={`recette${recipesCount > 1 ? 's' : ''}`} />
          </HomeTile>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <HomeTile feature="works" className="min-h-36"><p>À venir</p></HomeTile>
          <HomeTile feature="documents" className="min-h-36"><p>À venir</p></HomeTile>
          <HomeTile feature="photos" className="min-h-36 col-span-2"><p>À venir</p></HomeTile>
        </div>
      </div>
    </div>
  )
}
