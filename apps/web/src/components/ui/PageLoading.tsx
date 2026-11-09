import { FEATURES, type FeatureId } from '@/lib/ui/features'
import PageHeader from '@/components/ui/PageHeader'

// Écran affiché dès le clic, pendant que le serveur prépare la page :
// le titre de la page tout de suite (celui de la fonctionnalité, ou `header` pour l'accueil),
// puis des blocs d'attente dans sa couleur douce si l'attente se prolonge.
// Le fondu vient de page-wrap (globals.css).
export default function PageLoading({ feature, header }: { feature?: FeatureId; header?: React.ReactNode }) {
  const soft = feature ? FEATURES[feature].soft : 'bg-coconut'
  return (
    <div className="page-wrap" aria-busy="true">
      {feature ? <PageHeader feature={feature} /> : header}
      <span className="sr-only">Chargement…</span>
      {/* Les blocs n'apparaissent (en fondu) qu'après 150 ms : si la page arrive avant, on ne les voit jamais */}
      <div className="flex flex-col gap-2" style={{ animationDelay: '150ms' }} aria-hidden="true">
        <div className={`skeleton h-28 ${soft}`} />
        <div className={`skeleton h-20 ${soft}`} />
        <div className={`skeleton h-20 ${soft}`} />
      </div>
    </div>
  )
}
