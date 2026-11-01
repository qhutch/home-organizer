import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import HouseholdMembers from './HouseholdMembers'

export default async function HouseholdPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [householdDoc, membersSnap] = await Promise.all([
    db.collection('households').doc(membership.householdId).get(),
    db.collection('households').doc(membership.householdId).collection('members').get(),
  ])

  const household = householdDoc.data()
  const memberUids = membersSnap.docs.map(d => d.id)

  const profileDocs = await Promise.all(
    memberUids.map(uid => db.collection('userProfiles').doc(uid).get())
  )

  const enriched = membersSnap.docs.map((doc, i) => ({
    userId: doc.id,
    role: doc.data().role as 'owner' | 'member',
    displayName: profileDocs[i].data()?.displayName ?? null,
  }))

  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-bold mb-1">Mon foyer</h2>
      <p className="text-gray-400 text-sm mb-6">{household?.name}</p>

      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Membres</h3>
      <HouseholdMembers
        members={enriched}
        householdId={membership.householdId}
        currentUserId={user.uid}
        isOwner={membership.role === 'owner'}
      />
    </div>
  )
}
