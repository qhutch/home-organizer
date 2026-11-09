import Link from 'next/link'
import Icon, { type IconName } from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'

const CHOICES: { href: string; icon: IconName; title: string; detail: string }[] = [
  { href: '/recipes/new/import', icon: 'import', title: 'Importer avec Claude', detail: 'Depuis une photo, une capture Insta, un lien ou un texte' },
  { href: '/recipes/new/write', icon: 'pencil', title: 'Écrire moi-même', detail: 'Je remplis la recette à la main' },
]

// Premier choix avant d'ajouter une recette : importer ou écrire.
export default function NewRecipePage() {
  return (
    <div className="page-wrap max-w-xl">
      <h1 className="text-3xl mb-2">Nouvelle recette</h1>
      <p className="text-sm text-ink-muted mb-6">Comment veux-tu l’ajouter ?</p>
      <div className="flex flex-col gap-2">
        {CHOICES.map(c => (
          <Link key={c.href} href={c.href} className="card !py-4 flex items-center gap-4 hover:bg-coconut transition-colors">
            <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${FEATURES.recipes.soft} ${FEATURES.recipes.text}`}>
              <Icon name={c.icon} size={22} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="font-medium block">{c.title}</span>
              <span className="text-sm text-ink-muted block">{c.detail}</span>
            </span>
            <Icon name="chevronRight" size={20} className="shrink-0 text-ink-muted" />
          </Link>
        ))}
      </div>
    </div>
  )
}
