import PageLoading from '@/components/ui/PageLoading'
import HomeDate from '@/components/ui/HomeDate'

// Accueil : la date est déjà en place pendant le chargement.
export default function Loading() {
  return <PageLoading header={<HomeDate />} />
}
