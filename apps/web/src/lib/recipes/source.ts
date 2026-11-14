// Nom du site d'une recette d'origine (« Marie Claire », « Marmiton »), pour le lien sur la fiche.
const SITES: [string, string][] = [
  ['marmiton.org', 'Marmiton'],
  ['marieclaire.fr', 'Marie Claire'],
  ['750g.com', '750g'],
  ['cuisineaz.com', 'Cuisine AZ'],
  ['jow.fr', 'Jow'],
  ['journaldesfemmes.fr', 'Journal des Femmes'],
  ['elle.fr', 'Elle à table'],
  ['femmeactuelle.fr', 'Femme Actuelle'],
  ['ptitchef.com', 'Ptitchef'],
  ['chefsimon.com', 'Chef Simon'],
  ['hervecuisine.com', 'Hervé Cuisine'],
  ['ricardocuisine.com', 'Ricardo'],
  ['cuisineactuelle.fr', 'Cuisine Actuelle'],
  ['papillesetpupilles.fr', 'Papilles et Pupilles'],
  ['lesfoodies.com', 'Les Foodies'],
  ['quitoque.fr', 'Quitoque'],
  ['hellofresh.fr', 'HelloFresh'],
  ['instagram.com', 'Instagram'],
  ['tiktok.com', 'TikTok'],
  ['youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
  ['pinterest.com', 'Pinterest'],
  ['pinterest.fr', 'Pinterest'],
  ['facebook.com', 'Facebook'],
]

export function sourceSiteName(link: string): string | null {
  let host: string
  try {
    host = new URL(link).hostname.toLowerCase()
  } catch {
    return null
  }
  const known = SITES.find(([domain]) => host === domain || host.endsWith(`.${domain}`))
  if (known) return known[1]
  // Inconnu : le nom du domaine, sans « www. » ni l'extension (« monblog.fr » → « Monblog »)
  const parts = host.replace(/^www\d?\./, '').split('.')
  const name = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0]
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : null
}
