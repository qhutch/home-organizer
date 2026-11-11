import type { Work, WorkStatus } from '@/types/database'

export const WORK_STATUSES: { id: WorkStatus; label: string }[] = [
  { id: 'todo', label: 'À faire' },
  { id: 'doing', label: 'En cours' },
  { id: 'done', label: 'Terminé' },
]

// Pièces proposées dans la fiche, avant celles déjà notées sur d'autres travaux
export const COMMON_ROOMS = ['Cuisine', 'Salon', 'Chambre', 'Salle de bain', 'Toilettes', 'Entrée', 'Garage', 'Jardin', 'Extérieur']

// « 1 250 € », « 49,90 € »
export function formatBudget(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 })
}

// « 3 novembre », avec l'année si ce n'est pas cette année
export function formatDay(iso: string) {
  const date = new Date(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric', timeZone: 'Europe/Paris' })
}

// Détail sous le nom d'un travail : artisan et son jour d'intervention, pièce, étapes faites, budget
export function workDetail(work: Work, artisanName?: string | null) {
  const parts: string[] = []
  if (artisanName) parts.push(work.interventionDate ? `${artisanName}, ${formatInterventionDay(work.interventionDate)}` : artisanName)
  if (work.room) parts.push(work.room)
  if (work.steps.length) parts.push(`${work.steps.filter(s => s.done).length}/${work.steps.length} étapes`)
  if (work.budget !== null) parts.push(formatBudget(work.budget))
  return parts.join(' · ')
}

// Métiers proposés dans la fiche d'un artisan
export const TRADES = ['Plombier', 'Électricien', 'Chauffagiste', 'Peintre', 'Menuisier', 'Maçon', 'Couvreur', 'Carreleur', 'Serrurier', 'Jardinier']

// Jour d'intervention (AAAA-MM-JJ) : « mardi 12 novembre », avec l'année si ce n'est pas cette année
export function formatInterventionDay(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const sameYear = y === new Date().getFullYear()
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' })
}
