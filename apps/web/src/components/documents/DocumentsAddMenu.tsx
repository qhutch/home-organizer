'use client'

import { useEffect, useState } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'

// Le + des documents, comme celui des recettes (AddRecipeMenu) : il ouvre en éventail
// « Nouveau dossier », « Scanner » et « Ajouter des documents », par-dessus la page assombrie.
// Les choix lancent leur action dans le toucher même (Safari n'ouvre l'appareil photo qu'ainsi).
export default function DocumentsAddMenu({ onNewFolder, onScan, onAddFiles, canUpload }: {
  onNewFolder: () => void
  onScan: () => void
  onAddFiles: () => void
  canUpload: boolean
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const choices: { id: string; icon: IconName; title: string; run: () => void }[] = [
    { id: 'folder', icon: 'folderPlus', title: 'Nouveau dossier', run: onNewFolder },
    ...(canUpload ? [
      { id: 'scan', icon: 'scan' as IconName, title: 'Scanner', run: onScan },
      { id: 'files', icon: 'upload' as IconName, title: 'Ajouter des documents', run: onAddFiles },
    ] : []),
  ]

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-ink/30 transition-opacity duration-200 motion-reduce:transition-none ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <div className="relative pointer-events-auto">
        <ul
          id="add-document-menu"
          className={`absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2 ${open ? '' : 'pointer-events-none'}`}
          aria-hidden={!open}
        >
          {choices.map((c, i) => (
            <li
              key={c.id}
              style={{ transitionDelay: open ? `${(choices.length - 1 - i) * 50}ms` : '0ms' }}
              className={`transition-all duration-200 ease-out motion-reduce:transition-none ${open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}
            >
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => { setOpen(false); c.run() }}
                className="flex items-center gap-3 rounded-full bg-surface hairline pl-5 pr-1.5 py-1.5 whitespace-nowrap text-sm font-semibold hover:bg-coconut"
              >
                {c.title}
                <span className={`w-11 h-11 rounded-full flex items-center justify-center ${FEATURES.documents.soft} ${FEATURES.documents.text}`}>
                  <Icon name={c.icon} size={22} />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="add-document-menu"
          aria-label={open ? 'Fermer' : 'Ajouter'}
          className={`icon-btn-fill icon-btn-lg ${FEATURES.documents.fill}`}
        >
          <span className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-45' : ''}`}>
            <Icon name="plus" />
          </span>
        </button>
      </div>
    </>
  )
}
