import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import ArtisanList from '@/components/works/ArtisanList'
import { getArtisans, getWorks } from '../actions'

export default async function ArtisansPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [artisans, works] = await Promise.all([getArtisans(), getWorks()])
  // Nombre de travaux où intervient chaque artisan
  const workCounts: Record<string, number> = {}
  for (const w of works) if (w.artisanId) workCounts[w.artisanId] = (workCounts[w.artisanId] ?? 0) + 1
  return <ArtisanList artisans={artisans} workCounts={workCounts} />
}
