'use client'

import { useState } from 'react'
import Sheet from '@/components/ui/Sheet'
import Icon from '@/components/ui/Icon'
import DestinationChips, { type Destination } from '@/components/documents/DestinationChips'
import type { HouseholdDocument } from '@/types/database'

// Fiche d'un document : son nom et sa date d'expiration (enregistrés en quittant le champ),
// le dossier où le ranger (le toucher le déplace tout de suite), le téléchargement et la corbeille.
export default function DocumentSheet({ document, destinations, onRename, onExpiry, onMove, onTrash, onClose }: {
  document: HouseholdDocument
  destinations: Destination[]
  onRename: (name: string) => void
  onExpiry: (date: string | null) => void
  onMove: (folderId: string | null) => void
  onTrash: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(document.name)
  const [expiry, setExpiry] = useState(document.expiresOn ?? '')

  function saveName() {
    const clean = name.trim()
    if (!clean) return setName(document.name)
    if (clean !== document.name) onRename(clean)
  }

  function saveExpiry(value: string) {
    setExpiry(value)
    if ((value || null) !== document.expiresOn) onExpiry(value || null)
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

      <div className="flex flex-col gap-2">
        <label htmlFor="document-expiry" className="eyebrow">Expire le</label>
        <div className="flex items-center gap-2">
          <input
            id="document-expiry"
            type="date"
            value={expiry}
            onChange={e => saveExpiry(e.target.value)}
            className="field"
          />
          {expiry && (
            <button type="button" onClick={() => saveExpiry('')} className="icon-btn" aria-label="Enlever la date d’expiration">
              <Icon name="close" size={20} />
            </button>
          )}
        </div>
      </div>

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
