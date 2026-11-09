import type { MetadataRoute } from 'next'

// Fait de Hestia une app web : ajoutée à l'écran d'accueil, elle s'ouvre en plein écran,
// sans la barre d'adresse ni les boutons du navigateur (on navigue dans l'app).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hestia',
    short_name: 'Hestia',
    description: 'Organisation du foyer',
    start_url: '/',
    display: 'standalone',
    // Couleur du fond (page) pendant l'ouverture et de la barre système
    background_color: '#F5EFE7',
    theme_color: '#F5EFE7',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
