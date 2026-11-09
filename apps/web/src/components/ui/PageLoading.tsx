import { FEATURES, type FeatureId } from '@/lib/ui/features'
import PageHeader from '@/components/ui/PageHeader'

// Écran affiché dès le clic, pendant que le serveur prépare la page :
// l'en-tête de la fonctionnalité tout de suite, puis des blocs d'attente dans sa couleur douce.
export default function PageLoading({ feature }: { feature?: FeatureId }) {
  const soft = feature ? FEATURES[feature].soft : 'bg-coconut'
  return (
    <div className="page-wrap" aria-busy="true">
      {feature && <PageHeader feature={feature} />}
      <span className="sr-only">Chargement…</span>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <div className={`skeleton h-28 ${soft}`} />
        <div className={`skeleton h-20 ${soft}`} />
        <div className={`skeleton h-20 ${soft}`} />
      </div>
    </div>
  )
}
