'use client'

import { useState } from 'react'
import Sheet from '@/components/ui/Sheet'
import Icon from '@/components/ui/Icon'
import DestinationChips, { type Destination } from '@/components/documents/DestinationChips'
import PrivacyChips from '@/components/documents/PrivacyChips'
import type { HouseholdDocument } from '@/types/database'

// Fiche d'un document : son nom (enregistré en quittant le champ),
// qui le voit, le dossier où le ranger (le toucher le déplace tout de suite), le téléchargement et la corbeille.
// me : le membre connecté ; shareLabel : « Moi et Quentin » (null si on est seul dans le foyer).
export default function DocumentSheet({ document, destinations, me, shareLabel, onRename, onPrivacy, onMove, onTrash, onClose }: {
  document: HouseholdDocument
  destinations: Destination[]
  me: string
  shareLabel: string | null
  onPrivacy: (isPrivate: boolean) => void
  onRename: (name: string) => void
  onMove: (folderId: string | null) => void
  onTrash: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(document.name)

  function saveName() {
    const clean = name.trim()
    if (!clean) return setName(document.name)
    if (clean !== document.name) onRename(clean)
  }

  return (
    <Sheet title={document.name} onClose={() => { saveName(); onClose() }}>
      <div className="flex flex-col gap-2">
        <label htmlFor="document-name" className="eyebrow">Nom</label>
        <input
          id="document-name"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          maxLength={200}
          className="field"
        />
      </div>

      {/* Dans un dossier privé, il l'est déjà ; seul celui qui l'a ajouté peut le rendre privé */}
      {shareLabel && !document.inPrivateFolder && (document.privateTo === me || document.addedBy === me) && (
        <PrivacyChips value={document.privateTo === me} shareLabel={shareLabel} onChange={onPrivacy} />
      )}

      <DestinationChips destinations={destinations} current={document.folderId} onPick={onMove} />

      <div className="flex flex-wrap gap-2 pt-1">
        <a href={`/api/documents/${document.id}?download=1`} className="btn-outline">
          <Icon name="download" />
          Télécharger
        </a>
        <button type="button" onClick={onTrash} className="btn-danger">
          <Icon name="trash" />
          Mettre à la corbeille
        </button>
      </div>
    </Sheet>
  )
}
