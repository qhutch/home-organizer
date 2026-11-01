import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import JoinButton from './JoinButton'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/login?redirectTo=/setup/invite/${token}`)

  const existing = await getUserHousehold(user.uid)
  if (existing) redirect('/')

  const inviteDoc = await db.collection('invites').doc(token).get()

  if (!inviteDoc.exists || new Date(inviteDoc.data()!.expiresAt) < new Date()) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">❌</p>
          <p className="text-gray-600 text-sm">Ce lien d&apos;invitation est invalide ou expiré.</p>
        </div>
      </div>
    )
  }

  const { householdId } = inviteDoc.data()!
  const householdDoc = await db.collection('households').doc(householdId).get()
  const household = householdDoc.data()

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-4xl mb-4">🏠</p>
        <h2 className="text-xl font-bold mb-2">Rejoindre le foyer</h2>
        <p className="text-gray-500 text-sm mb-6">
          Tu as été invité(e) à rejoindre <strong>{household?.name}</strong>.
        </p>
        <JoinButton householdId={householdId} token={token} />
      </div>
    </div>
  )
}
