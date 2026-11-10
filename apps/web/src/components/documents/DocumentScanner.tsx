'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { buildScanPdf, type ScanLook, type ScanPage } from '@/lib/documents/scan'

const feature = FEATURES.documents

function defaultName() {
  return `Scan du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

function toPages(files: FileList | null): ScanPage[] {
  return Array.from(files ?? [])
    .filter(f => f.type.startsWith('image/'))
    .map(file => ({ id: `${file.name}-${Math.random()}`, file, url: URL.createObjectURL(file), rotation: 0 }))
}

// Scanner un papier : une photo par page (appareil photo du téléphone), qu'on peut tourner ou retirer,
// en couleur ou façon photocopie ; « Enregistrer » en fait un PDF, envoyé comme un autre document.
export default function DocumentScanner({ firstPages, onSave, onClose }: {
  firstPages: FileList
  onSave: (file: File) => void
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pages, setPages] = useState<ScanPage[]>(() => toPages(firstPages))
  const [look, setLook] = useState<ScanLook>('document')
  const [name, setName] = useState(defaultName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Libère les aperçus en partant
  const urls = useRef(pages)
  useEffect(() => { urls.current = pages }, [pages])
  useEffect(() => () => urls.current.forEach(p => URL.revokeObjectURL(p.url)), [])

  function rotate(id: string) {
    setPages(list => list.map(p => (p.id === id ? { ...p, rotation: ((p.rotation + 90) % 360) as ScanPage['rotation'] } : p)))
  }

  function remove(id: string) {
    setPages(list => {
      const page = list.find(p => p.id === id)
      if (page) URL.revokeObjectURL(page.url)
      return list.filter(p => p.id !== id)
    })
  }

  async function save() {
    if (!pages.length) return
    setBusy(true)
    setError(null)
    try {
      onSave(await buildScanPdf(pages, look, name.trim() || defaultName()))
      onClose()
    } catch {
      setError('Le scan n’a pas pu être créé')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-page overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <div className="page-wrap max-w-2xl mx-auto pb-32">
        <div className="flex items-center gap-3 pt-5 mb-5">
          <h2 id="scan-title" className={`text-3xl leading-tight flex-1 ${feature.text}`}>Scanner</h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Fermer sans enregistrer">
            <Icon name="close" />
          </button>
        </div>

        <ol className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {pages.map((page, i) => (
            <li key={page.id} className="card !p-2 flex flex-col gap-2">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-coconut flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- photo locale, pas encore envoyée */}
                <img
                  src={page.url}
                  alt={`Page ${i + 1}`}
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{
                    transform: `rotate(${page.rotation}deg)`,
                    filter: look === 'document' ? 'grayscale(1) contrast(1.6) brightness(1.15)' : undefined,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium pl-2">Page {i + 1}</span>
                <span className="flex">
                  <button type="button" onClick={() => rotate(page.id)} className="icon-btn" aria-label={`Tourner la page ${i + 1}`}>
                    <Icon name="rotate" size={20} />
                  </button>
                  <button type="button" onClick={() => remove(page.id)} className="icon-btn" aria-label={`Retirer la page ${i + 1}`}>
                    <Icon name="trash" size={20} />
                  </button>
                </span>
              </div>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`w-full h-full min-h-40 rounded-3xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 font-semibold text-sm hover:bg-coconut ${feature.text}`}
            >
              <Icon name="camera" size={28} />
              Ajouter une page
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={e => { const added = toPages(e.target.files); setPages(list => [...list, ...added]); e.target.value = '' }}
            />
          </li>
        </ol>

        <div className="flex flex-col gap-2 mt-6">
          <label htmlFor="scan-name" className="eyebrow">Nom</label>
          <input id="scan-name" value={name} onChange={e => setName(e.target.value)} maxLength={150} className="field" />
        </div>

        <fieldset className="flex flex-col gap-2 mt-5">
          <legend className="eyebrow mb-2">Rendu</legend>
          <div className="flex gap-2">
            <button type="button" aria-pressed={look === 'document'} onClick={() => setLook('document')} className={`chip ${look === 'document' ? 'is-active' : ''}`}>Photocopie</button>
            <button type="button" aria-pressed={look === 'color'} onClick={() => setLook('color')} className={`chip ${look === 'color' ? 'is-active' : ''}`}>Couleur</button>
          </div>
        </fieldset>

        {error && <p role="alert" className="text-sm text-pink-deep mt-4">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={save} disabled={busy || !pages.length} className={`btn-feature btn-lg w-full max-w-lg ${feature.fill}`}>
          {busy ? 'Création du PDF…' : pages.length > 1 ? `Enregistrer les ${pages.length} pages` : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
