const TIME_ZONE = 'Europe/Paris'

// Titre de l'accueil : le jour de la semaine puis la date en grand.
// C'est un <header> : déjà affiché par l'écran de chargement, il ne repasse pas en fondu (voir page-wrap).
export default function HomeDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('fr-FR', { timeZone: TIME_ZONE, weekday: 'long' })
  const dayNumber = now.toLocaleDateString('fr-FR', { timeZone: TIME_ZONE, day: '2-digit' })
  const month = now.toLocaleDateString('fr-FR', { timeZone: TIME_ZONE, month: 'short' }).replace('.', '')
  return (
    <header className="mb-6">
      <p className="text-sm text-ink-muted capitalize">{weekday}</p>
      <h1 className="text-6xl leading-none uppercase mt-1">
        {dayNumber} {month}
      </h1>
    </header>
  )
}
