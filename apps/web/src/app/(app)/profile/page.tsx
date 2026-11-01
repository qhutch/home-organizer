import { db } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profileDoc = await db.collection('userProfiles').doc(user.uid).get()
  const profile = profileDoc.data()

  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-6">Mon profil</h2>
      <ProfileForm email={user.email ?? ''} displayName={profile?.displayName ?? ''} />
    </div>
  )
}
