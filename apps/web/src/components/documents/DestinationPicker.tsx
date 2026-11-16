'use client'

export type Destination = { id: string; label: string; href: string; ids: string[]; privateTo?: string | null }

// Choix du dossier où ranger, en menu déroulant (« Documents » = la racine, puis chaque dossier
// avec son chemin, « Maison › Devis et Factures ») : le choisir range tout de suite.
// exclude : un dossier qu'on déplace ne peut pas aller dans lui-même ni dans ses sous-dossiers.
export default function DestinationPicker({ destinations, current, exclude, onPick }: {
  destinations: Destination[]
  current: string | null | undefined
  exclude?: string
  onPick: (folderId: string | null) => void
}) {
  const places = destinations.filter(d => !exclude || !d.ids.includes(exclude))
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="destination" className="eyebrow">Ranger dans</label>
      <select
        id="destination"
        value={current ?? ''}
        onChange={e => onPick(e.target.value || null)}
        className="field"
      >
        <option value="">Documents</option>
        {places.map(place => (
          <option key={place.id} value={place.id}>
            {place.label}{place.privateTo ? ' 🔒' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
