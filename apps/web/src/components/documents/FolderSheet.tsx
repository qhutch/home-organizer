'use client'

import { useState } from 'react'
import Sheet from '@/components/ui/Sheet'
import Icon from '@/components/ui/Icon'
import DestinationChips, { type Destination } from '@/components/documents/DestinationChips'

// Fiche d'un dossier : son nom (enregistré en quittant le champ), où le ranger, et sa suppression s'il est vide
export default function FolderSheet({ folder, parentId, destinations, empty, onRename, onMove, onDelete, onClose }: {
  folder: { id: string; name: string }
  parentId: string | null
  destinations: Destination[]
  empty: boolean
  onRename: (name: string) => void
  onMove: (parentId: string | null) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(folder.name)

  function saveName() {
    const clean = name.trim()
    if (!clean) return setName(folder.name)
    if (clean !== folder.name) onRename(clean)
  }

  return (
    <Sheet title={folder.name} onClose={() => { saveName(); onClose() }}>
      <div className="flex flex-col gap-2">
        <label htmlFor="folder-name" className="eyebrow">Nom</label>
        <input
          id="folder-name"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          maxLength={80}
          className="field"
        />
      </div>

      <DestinationChips destinations={destinations} current={parentId} exclude={folder.id} onPick={onMove} />

      {empty && (
        <div className="pt-1">
          <button type="button" onClick={onDelete} className="btn-danger">
            <Icon name="trash" />
            Supprimer le dossier
          </button>
        </div>
      )}
    </Sheet>
  )
}
