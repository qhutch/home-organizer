import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { notFound, redirect } from 'next/navigation'
import WorkEditor from '@/components/works/WorkEditor'
import { getArtisans, getPapers, getWork, getWorkMembers, getWorks } from '../actions'
import { documentStorage } from '@/lib/documents/storage'

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const { id } = await params
  const [work, members, works, artisans, papers] = await Promise.all([getWork(id), getWorkMembers(), getWorks(), getArtisans(), getPapers({ workId: id })])
  if (!work) notFound()

  // Pièces déjà notées sur les autres travaux, proposées après les pièces courantes
  const rooms = [...new Set(works.map(w => w.room).filter((r): r is string => !!r && r !== work.room))]
  return <WorkEditor key={work.id} initialWork={work} members={members} rooms={rooms} initialArtisans={artisans} papers={papers} canUpload={!!documentStorage()} />
}
