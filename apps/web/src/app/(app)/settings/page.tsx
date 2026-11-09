import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import HouseholdMembers from './HouseholdMembers'
import SettingsTitle from './SettingsTitle'
import InviteButton from '@/components/InviteButton'
import LogoutButton from '@/components/LogoutButton'

// Une seule page pour tous les réglages : le foyer (dont mon prénom, les membres, les invitations), l'agenda relié.
export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const householdRef = db.collection('households').doc(membership.householdId)
  const [membersSnap, calendarDoc] = await Promise.all([
    householdRef.collection('members').get(),
    householdRef.collection('calendarConnections').doc('main').get(),
  ])
  const calendarName = calendarDoc.exists ? (calendarDoc.data()?.calendarName as string | undefined) ?? null : null

  const profileDocs = await Promise.all(
    membersSnap.docs.map(d => db.collection('userProfiles').doc(d.id).get())
  )
  const members = membersSnap.docs.map((doc, i) => ({
    userId: doc.id,
    role: doc.data().role as 'owner' | 'member',
    displayName: profileDocs[i].data()?.displayName ?? null,
  }))
  const isOwner = membership.role === 'owner'

  return (
    <div className="page-wrap max-w-xl">
      <SettingsTitle />

      <div className="flex items-center justify-between mb-3">
        <h2 className="eyebrow">Foyer</h2>
        {isOwner && <InviteButton householdId={membership.householdId} />}
      </div>
      <HouseholdMembers
        members={members}
        householdId={membership.householdId}
        currentUserId={user.uid}
        currentUserEmail={user.email ?? ''}
        isOwner={isOwner}
      />

      <h2 className="eyebrow mt-8 mb-3">Agenda Google</h2>
      <div className="card flex flex-col gap-3">
        {calendarDoc.exists ? (
          <>
            <p className="text-sm">
              Agenda affiché : <span className="font-medium">{calendarName ?? 'aucun'}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/calendar/pick" className="btn-outline">Changer d’agenda</a>
              <a href={`/api/calendar/auth?householdId=${membership.householdId}`} className="btn-outline">Renouveler l’accès Google</a>
            </div>
            <p className="text-xs text-ink-muted">
              Si les événements n’apparaissent plus, renouvelez l’accès : Google le demande de temps en temps.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">Aucun agenda relié pour l’instant.</p>
            <a href={`/api/calendar/auth?householdId=${membership.householdId}`} className="btn self-start">Connecter Google Agenda</a>
          </>
        )}
      </div>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  )
}
