import { FEATURES, type FeatureId } from '@/lib/ui/features'

// Icônes dessinées des quatre fonctionnalités, posées en grand au fond des cartes de l'accueil.
const ART: Record<FeatureId, { transform?: string; shapes: string[]; dots?: [number, number, number][]; cuts?: string[]; cutDots?: [number, number, number][]; cutShapes?: string[] }> = {
  shopping: {
    shapes: ['M7 10C4 10 4 16 7 16L14 16L20 40C21 43 23 44 26 44L50 44C53 44 54 42 55 39L59 22C60 19 58 18 56 18L20 18L18 12C17 10 16 10 15 10Z'],
    dots: [[25, 53, 5.5], [47, 53, 5.5]],
    cuts: ['M32 24L31 38', 'M43 24L42 38', 'M26 31L50 31'],
  },
  calendar: {
    shapes: ['M14 13C10 13 8 15 8 19L8 50C8 54 10 57 14 57L50 57C54 57 56 54 56 50L56 19C56 15 54 13 50 13Z', 'M19 6C21 5 24 5 25 6L25 17C24 19 20 19 19 17Z', 'M39 6C41 5 44 5 45 6L45 17C44 19 40 19 39 17Z'],
    cuts: ['M8 26L56 26'],
    cutDots: [[21, 36, 3], [32, 36, 3], [43, 36, 3], [21, 47, 3], [32, 47, 3]],
  },
  recipes: {
    shapes: ['M18 38C9 37 5 30 7 23C9 16 17 13 23 16C25 9 31 7 35 8C41 9 44 13 45 16C51 14 57 18 58 24C59 31 54 37 47 38L47 46L18 46Z', 'M18 50L47 50C49 50 49 57 46 57L19 57C16 57 16 50 18 50Z'],
    cuts: ['M26 30L26 40', 'M38 30L38 40'],
  },
  works: {
    transform: 'rotate(-40 32 32) translate(3 0)',
    shapes: ['M12 9L38 9C46 9 53 13 56 20C56.5 22 54.5 23 53 22C49 19 44 18 40 19L40 25L12 25C10 25 9 24 9 22L9 12C9 10 10 9 12 9Z', 'M27 28L37 28L39 58C39 62 25 62 25 58Z'],
  },
  documents: {
    shapes: ['M8 16C8 12 10 10 14 10L26 10L32 17L50 17C54 17 56 19 56 23L56 50C56 54 54 56 50 56L14 56C10 56 8 54 8 50Z'],
    cuts: ['M18 34L46 34', 'M18 44L36 44'],
  },
  photos: {
    shapes: ['M12 12L52 12C55 12 56 14 56 16L56 48C56 51 55 52 52 52L12 52C9 52 8 51 8 48L8 16C8 14 9 12 12 12Z'],
    cutDots: [[22, 24, 4.5]],
    cutShapes: ['M14 46L28 30L36 39L42 33L50 46Z'],
  },
}

const CUT_FILL: Record<FeatureId, string> = {
  shopping: 'var(--color-citrouille)',
  calendar: 'var(--color-olive)',
  recipes: 'var(--color-rose)',
  works: 'var(--color-canard)',
  documents: 'var(--color-moutarde)',
  photos: 'var(--color-prune)',
}

// Sur Courses, le gros chiffre occupe la droite : l'icône passe à côté.
// Sur Calendrier, l'événement occupe le bas : l'icône monte dans le coin haut.
const PLACEMENT: Partial<Record<FeatureId, string>> = {
  shopping: 'right-24 -bottom-3',
  calendar: 'right-1 top-0',
}

const SIZE: Partial<Record<FeatureId, number>> = { shopping: 116, calendar: 84 }

// La même icône dessinée, en petit, à côté du titre d'une page. Elle prend la couleur
// du texte ; ses découpes reprennent le fond de la page.
export function FeatureIcon({ feature, size = 32 }: { feature: FeatureId; size?: number }) {
  const art = ART[feature]
  const cut = 'var(--color-page)'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <g transform={art.transform}>
        {art.shapes.map(d => <path key={d} d={d} fill="currentColor" />)}
        {art.dots?.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" />)}
        {art.cutShapes?.map(d => <path key={d} d={d} fill={cut} />)}
        {art.cuts?.map(d => <path key={d} d={d} fill="none" stroke={cut} strokeWidth={3.2} strokeLinecap="round" />)}
        {art.cutDots?.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={cut} />)}
      </g>
    </svg>
  )
}

export default function FeatureArt({ feature }: { feature: FeatureId }) {
  const size = SIZE[feature] ?? 100
  const art = ART[feature]
  const ink = FEATURES[feature].art
  const cut = CUT_FILL[feature]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`absolute pointer-events-none ${PLACEMENT[feature] ?? '-right-2 -bottom-3'}`}
    >
      <g transform={art.transform}>
        {art.shapes.map(d => <path key={d} d={d} fill={ink} />)}
        {art.dots?.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={ink} />)}
        {art.cutShapes?.map(d => <path key={d} d={d} fill={cut} />)}
        {art.cuts?.map(d => <path key={d} d={d} fill="none" stroke={cut} strokeWidth={3.2} strokeLinecap="round" />)}
        {art.cutDots?.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={cut} />)}
      </g>
    </svg>
  )
}
