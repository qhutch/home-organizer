'use client'

import Icon from '@/components/ui/Icon'

export type Destination = { id: string; label: string; href: string; ids: string[]; privateTo?: string | null }

// Choix du dossier où ranger (« Documents » = la racine) : le toucher range tout de suite.
// exclude : un dossier qu'on déplace ne peut pas aller dans lui-même ni dans ses sous-dossiers.
export default function DestinationChips({ destinations, current, exclude, onPick }: {
  destinations: Destination[]
  current: string | null | undefined
  exclude?: string
  onPick: (folderId: string | null) => void
}) {
  const places: { id: string | null; label: string; privateTo?: string | null }[] = [
    { id: null, label: 'Documents' },
    ...destinations.filter(d => !exclude || !d.ids.includes(exclude)),
  ]
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="eyebrow mb-2">Ranger dans</legend>
      <div className="flex flex-wrap gap-2">
        {places.map(place => {
          const here = place.id === current
          return (
            <button
              key={place.id ?? 'root'}
              type="button"
              aria-pressed={here}
              onClick={() => { if (!here) onPick(place.id) }}
              className={`chip inline-flex items-center gap-1.5 ${here ? "is-active" : ""}`}
            >
              <Icon name="folder" size={18} />
              {place.label}
              {place.privateTo && <><Icon name="lock" size={16} className="text-ink-muted" /><span className="sr-only">, privé</span></>}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
