import { ImageResponse } from 'next/og'

// Icône de l'app (écran d'accueil, onglet) : un H encre sur le fond crème de la page.
// Pleine, sans transparence ni coins arrondis : l'iPhone et Android arrondissent eux-mêmes.
export function appIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5EFE7',
          color: '#2E2C18',
          fontSize: size * 0.6,
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        H
      </div>
    ),
    { width: size, height: size },
  )
}
