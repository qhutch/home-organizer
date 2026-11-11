'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { unlinkPaper, type PaperLink } from '@/app/(app)/documents/actions'
import Icon from '@/components/ui/Icon'
import { iconFor } from '@/components/documents/DocumentThumb'
import { Section } from '@/components/works/Fields'
import { uploadDocument } from '@/lib/documents/upload'
import { FEATURES } from '@/lib/ui/features'
import { formatDay } from '@/lib/works/format'
import type { PaperKind, WorkPaper } from '@/types/database'

const KIND_LABEL: Record<PaperKind, string> = { quote: 'Devis', invoice: 'Facture' }

// « Devis et factures » d'un travail ou d'un artisan. Les fichiers sont rangés dans Documents (« Maison › Devis et Factures »)
// et s'ouvrent sans Face ID. On en ajoute d'un bouton ; la croix les retire d'ici sans les supprimer.
export default function WorkPapers({ papers, link, from, workTitles = {}, canUpload }: {
  papers: WorkPaper[]
  // Travail et artisan donnés aux nouveaux fichiers
  link: Omit<PaperLink, 'kind'>
  from: 'work' | 'artisan'
  // Sur la fiche d'un artisan : le nom du travail de chaque fichier
  workTitles?: Record<string, string>
  // Faux tant que le rangement des documents n'est pas branché
  canUpload: boolean
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<PaperKind>('quote')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removed, setRemoved] = useState<string[]>([])

  const shown = papers.filter(p => !removed.includes(p.id))
  if (!shown.length && !canUpload) return null

  function pick(next: PaperKind) {
    setKind(next)
    setError(null)
    input.current?.click()
  }

  async function upload(files: File[]) {
    setError(null)
    for (const [i, file] of files.entries()) {
      setProgress(i / files.length)
      const result = await uploadDocument(file, null, {
        paper: { kind, ...link },
        onProgress: p => setProgress((i + p) / files.length),
      })
      if (!result.ok) {
        setError(result.duplicate ? `Déjà rangé : ${result.duplicate.name}` : result.error === 'locked' ? 'Envoi impossible' : result.error)
        break
      }
    }
    setProgress(null)
    router.refresh()
  }

  async function remove(paper: WorkPaper) {
    setRemoved(r => [...r, paper.id])
    const result = await unlinkPaper(paper.id, from)
    if (!result.ok) setRemoved(r => r.filter(id => id !== paper.id))
  }

  return (
    <Section title="Devis et factures" aside={shown.length ? String(shown.length) : undefined}>
      {shown.length > 0 && (
        <ul className="flex flex-col gap-1.5 mb-2">
          {shown.map(paper => {
            const detail = [
              KIND_LABEL[paper.kind],
              paper.createdAt ? formatDay(paper.createdAt) : null,
              from === 'artisan' && paper.workId ? workTitles[paper.workId] : null,
            ].filter(Boolean).join(' · ')
            return (
              <li key={paper.id} className="bg-surface hairline rounded-2xl flex items-center gap-3 pl-2 pr-1">
                <a href={`/api/documents/${paper.id}`} target="_blank" rel="noopener" className="flex-1 min-w-0 flex items-center gap-3 py-2">
                  {paper.hasThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- aperçu déjà réduit, servi par notre route
                    <img src={`/api/documents/${paper.id}/thumb`} alt="" className="w-10 h-10 rounded-xl object-cover object-top shrink-0 bg-surface hairline" />
                  ) : (
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${FEATURES.works.soft}`}>
                      <Icon name={iconFor(paper.mimeType)} size={20} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{paper.name}</span>
                    <span className="block text-xs text-ink-muted truncate">{detail}</span>
                  </span>
                </a>
                {/* Sur la fiche d'un artisan, un fichier qui lui vient seulement d'un travail se retire depuis ce travail */}
                {(from === 'work' || paper.artisanId === link.artisanId) && <button
                  type="button"
                  onClick={() => remove(paper)}
                  aria-label={`Retirer « ${paper.name} » ${from === 'work' ? 'de ce travail' : 'de cet artisan'}`}
                  className="icon-btn icon-btn-sm text-ink-muted"
                >
                  <Icon name="close" />
                </button>}
              </li>
            )
          })}
        </ul>
      )}

      {canUpload && (
        <>
          {progress !== null ? (
            <p className={`text-sm font-semibold py-3 ${FEATURES.works.text}`}>
              Envoi… {Math.round(progress * 100)} %
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => pick('quote')} className={`btn-feature-outline ${FEATURES.works.text}`}>
                <Icon name="plus" />
                Devis
              </button>
              <button type="button" onClick={() => pick('invoice')} className={`btn-feature-outline ${FEATURES.works.text}`}>
                <Icon name="plus" />
                Facture
              </button>
            </div>
          )}
          {error && <p className="text-sm text-pink-deep mt-2">{error}</p>}
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/*"
            multiple
            hidden
            onChange={e => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (files.length) void upload(files)
            }}
          />
        </>
      )}
    </Section>
  )
}
