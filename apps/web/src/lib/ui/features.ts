// Chaque fonctionnalité a sa couleur, la même partout : accueil, en-tête de page, éléments.
// Les paires fond/texte respectent le contraste 4,5:1 (voir globals.css).

import type { IconName } from '@/components/ui/Icon'

export type FeatureId = 'shopping' | 'calendar' | 'recipes' | 'works' | 'documents' | 'photos' | 'films'

export type Feature = {
  id: FeatureId
  label: string
  href: string
  icon: IconName
  // Titre de la page, lisible sur le fond page (au moins 4,5:1)
  text: string
  // Grande carte pleine (accueil, icône active du menu)
  fill: string
  // Survol de l'onglet dans le menu du bas : la couleur de l'onglet, en léger
  hover: string
  // Grande icône de fond sur la carte de l'accueil : un ton plus sombre que fill
  art: string
  // Fond doux pour les éléments de la page (tuiles d'articles, cartes d'événements)
  soft: string
}

export const FEATURES: Record<FeatureId, Feature> = {
  shopping: { id: 'shopping', icon: 'shopping', label: 'Courses', href: '/shopping', text: 'text-mandarine-deep', fill: 'bg-citrouille text-citrouille-ink', art: 'var(--color-citrouille-art)', hover: 'hover:bg-mandarine-soft', soft: 'bg-mandarine-soft text-ink' },
  calendar: { id: 'calendar', icon: 'calendar', label: 'Calendrier', href: '/calendar', text: 'text-moss', fill: 'bg-olive text-olive-ink', art: 'var(--color-olive-art)', hover: 'hover:bg-pistachio-soft', soft: 'bg-pistachio-soft text-ink' },
  recipes: { id: 'recipes', icon: 'recipes', label: 'Recettes', href: '/recipes', text: 'text-pink-deep', fill: 'bg-rose text-rose-ink', art: 'var(--color-rose-art)', hover: 'hover:bg-pink-soft', soft: 'bg-pink-soft text-ink' },
  works: { id: 'works', icon: 'works', label: 'Travaux', href: '/works', text: 'text-ardoise-deep', fill: 'bg-ardoise text-ardoise-ink', art: 'var(--color-ardoise-art)', hover: 'hover:bg-ardoise-soft', soft: 'bg-ardoise-soft text-ink' },
  documents: { id: 'documents', icon: 'documents', label: 'Documents', href: '/documents', text: 'text-moutarde-deep', fill: 'bg-moutarde text-moutarde-ink', art: 'var(--color-moutarde-art)', hover: 'hover:bg-moutarde-soft', soft: 'bg-moutarde-soft text-ink' },
  films: { id: 'films', icon: 'movie', label: 'Films et séries', href: '/films', text: 'text-sable-deep', fill: 'bg-sable text-sable-ink', art: 'var(--color-sable-art)', hover: 'hover:bg-sable-soft', soft: 'bg-sable-soft text-ink' },
  photos: { id: 'photos', icon: 'photos', label: 'Photos', href: '/photos', text: 'text-lavande-deep', fill: 'bg-lavande text-lavande-ink', art: 'var(--color-lavande-art)', hover: 'hover:bg-lavande-soft', soft: 'bg-lavande-soft text-ink' },
}
