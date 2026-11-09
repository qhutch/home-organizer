import Link from 'next/link'
import { FEATURES, type FeatureId } from '@/lib/ui/features'
import { FeatureIcon } from '@/components/ui/FeatureArt'

// En-tête très discret d'une page de fonctionnalité : son icône dessinée et son titre, dans sa couleur.
// Le titre ramène à la page d'accueil de la fonctionnalité (sans filtres), où qu'on soit dedans.
export default function PageHeader({ feature, aside }: { feature: FeatureId; aside?: React.ReactNode }) {
  const { text, label, href } = FEATURES[feature]
  return (
    <header className="flex items-center justify-between gap-3 mb-5">
      <h1 className={`text-3xl leading-tight min-w-0 ${text}`}>
        <Link href={href} className="flex items-center gap-2.5 w-fit hover:opacity-70 transition-opacity">
          <FeatureIcon feature={feature} />
          {label}
        </Link>
      </h1>
      {aside && <p className="text-sm font-medium shrink-0">{aside}</p>}
    </header>
  )
}
