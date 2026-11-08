import { FEATURES, type FeatureId } from '@/lib/ui/features'
import { FeatureIcon } from '@/components/ui/FeatureArt'

// En-tête très discret d'une page de fonctionnalité : son icône dessinée et son titre, dans sa couleur.
export default function PageHeader({ feature, aside }: { feature: FeatureId; aside?: React.ReactNode }) {
  const { text, label } = FEATURES[feature]
  return (
    <header className="flex items-center justify-between gap-3 mb-5">
      <h1 className={`flex items-center gap-2.5 text-3xl leading-tight min-w-0 ${text}`}>
        <FeatureIcon feature={feature} />
        {label}
      </h1>
      {aside && <p className="text-sm font-medium shrink-0">{aside}</p>}
    </header>
  )
}
