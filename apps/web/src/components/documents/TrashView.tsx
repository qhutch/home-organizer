'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import DocumentThumb from '@/components/documents/DocumentThumb'
import { formatDate } from '@/components/documents/DocumentRow'
import { useAutoLock } from '@/components/documents/useAutoLock'
import { deleteDocumentsForever, emptyTrash, restoreDocuments } from '@/app/(app)/documents/actions'
import type { HouseholdDocument } from '@/types/database'

// La corbeille des documents : chacun y reste 30 jours (lib/documents/library.ts), puis disparaît pour de bon.
// Remettre le range là où il était ; supprimer pour de bon demande deux touchers.
export default function TrashView({ documents, daysLeft, lockAfterMinutes }: {
  documents: HouseholdDocument[]
  daysLeft: Record<string, number>
  lockAfterMinutes: number
}) {
  const { outcome } = useAutoLock(lockAfterMinutes)
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-display font-semibold text-2xl tracking-tight flex-1">Corbeille</h2>
        {documents.length > 0 && (confirming === 'all' ? (
          <button type="button" onClick={async () => { setConfirming(null); outcome(await emptyTrash()) }} className="btn-danger">Tout supprimer pour de bon</button>
        ) : (
          <button type="button" onClick={() => setConfirming('all')} className="btn-danger">Vider</button>
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="card py-12 text-center"><p className="font-semibold">Corbeille vide</p></div>
      ) : (
        <ul className="card !p-2 flex flex-col">
          {documents.map(doc => {
            const left = daysLeft[doc.id] ?? 0
            return (
              <li key={doc.id} className="flex items-center gap-3 p-2.5">
                <DocumentThumb document={doc} className="opacity-70" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{doc.name}</span>
                  <span className="block text-xs text-ink-muted truncate">
                    {doc.place} · {doc.trashedAt ? formatDate(doc.trashedAt) : ''} · {left <= 1 ? 'dernier jour' : `encore ${left} jours`}
                  </span>
                </span>
                {confirming === doc.id ? (
                  <button type="button" onClick={async () => { setConfirming(null); outcome(await deleteDocumentsForever([doc.id])) }} className="btn-danger">Supprimer</button>
                ) : (
                  <>
                    <button type="button" onClick={async () => outcome(await restoreDocuments([doc.id]))} className="icon-btn" aria-label={`Remettre ${doc.name}`}>
                      <Icon name="restore" size={20} />
                    </button>
                    <button type="button" onClick={() => setConfirming(doc.id)} className="icon-btn" aria-label={`Supprimer ${doc.name} pour de bon`}>
                      <Icon name="trash" size={20} />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
