import PageLoading from '@/components/ui/PageLoading'
import SettingsTitle from './SettingsTitle'

// Réglages : le titre est déjà en place pendant le chargement.
export default function Loading() {
  return <PageLoading header={<SettingsTitle />} />
}
