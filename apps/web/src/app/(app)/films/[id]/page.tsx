import { notFound } from 'next/navigation'
import WatchEditor from '@/components/films/WatchEditor'
import { getWatch } from '../actions'

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await getWatch(id)
  if (!found) notFound()
  return <WatchEditor item={found.item} settings={found.settings} members={found.members} />
}
