import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'

export default async function PhotosPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  return (
    <div className="page-wrap">
      <PageHeader feature="photos" />
      <div className="card py-12 flex flex-col items-center gap-2 text-center">
        <p className="font-semibold">À venir</p>
        <p className="text-xs text-ink-muted">Les photos du foyer arriveront bientôt ici.</p>
      </div>
    </div>
  )
}
