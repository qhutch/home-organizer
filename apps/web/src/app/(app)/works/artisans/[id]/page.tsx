import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { notFound, redirect } from 'next/navigation'
import ArtisanEditor from '@/components/works/ArtisanEditor'
import { getArtisan, getPapers, getWorks } from '../../actions'
import { documentStorage } from '@/lib/documents/storage'

export default async function ArtisanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const { id } = await params
  const [artisan, works, papers] = await Promise.all([getArtisan(id), getWorks(), getPapers({ artisanId: id })])
  if (!artisan) notFound()

  // Ses travaux : les prochaines interventions d'abord, les terminés à la fin
  const linked = works
    .filter(w => w.artisanId === id)
    .sort((a, b) => {
      if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1
      if (a.status === 'done') return (b.doneAt ?? '').localeCompare(a.doneAt ?? '')
      return (a.interventionDate ?? '9999').localeCompare(b.interventionDate ?? '9999')
    })
  return <ArtisanEditor key={artisan.id} initialArtisan={artisan} works={linked} papers={papers} canUpload={!!(await documentStorage(membership.householdId))} />
}
