// Retour arrière (bouton ←, glissé depuis le bord, retour du navigateur) : on note la page visée,
// pour qu'elle puisse se remettre comme on l'avait laissée (filtres, défilement).
// Arriver autrement (titre, accueil) la montre de zéro.
const KEY = 'back-nav'

export function markBack(href: string) {
  try { sessionStorage.setItem(KEY, href) } catch {}
}

// Vrai si on arrive sur href par un retour. La page appelle clearBack() une fois affichée.
export function isBack(href: string) {
  if (typeof window === 'undefined') return false
  try { return sessionStorage.getItem(KEY) === href } catch { return false }
}

export function clearBack() {
  try { sessionStorage.removeItem(KEY) } catch {}
}
