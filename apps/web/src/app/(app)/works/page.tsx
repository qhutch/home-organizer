import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import WorkList from '@/components/works/WorkList'
import { getArtisans, getWorkMembers, getWorks } from './actions'

export default async function WorksPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [works, members, artisans] = await Promise.all([getWorks(), getWorkMembers(), getArtisans()])
  return <WorkList initialWorks={works} members={members} artisans={artisans} />
}
