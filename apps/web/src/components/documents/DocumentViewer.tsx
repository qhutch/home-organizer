'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import DocumentSheet from '@/components/documents/DocumentSheet'
import { iconFor } from '@/components/documents/DocumentThumb'
import { formatDate } from '@/components/documents/DocumentRow'
import { type Destination } from '@/components/documents/DestinationChips'
import { useAutoLock } from '@/components/documents/useAutoLock'
import { FEATURES } from '@/lib/ui/features'
import { formatSize } from '@/lib/documents/limits'
import { openPdf } from '@/lib/documents/pdf'
import { lock, moveDocuments, renameDocument, setDocumentPrivate, trashDocuments } from '@/app/(app)/documents/actions'
import type { HouseholdDocument } from '@/types/database'

const feature = FEATURES.documents
const IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']

// Les pages d'un PDF, dessinées l'une après l'autre à la largeur de l'écran (pdf.js) :
// sur iPhone, Safari n'affiche que la première page d'un PDF intégré.
function PdfPages({ url, name }: { url: string; name: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    const box = container.current
    if (!box) return
    ;(async () => {
      try {
        const pdf = await openPdf(url)
        const width = box.clientWidth
        const ratio = window.devicePixelRatio || 1
        for (let n = 1; n <= pdf.numPages && !cancelled; n++) {
          const page = await pdf.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(viewport.width)
          canvas.height = Math.round(viewport.height)
          canvas.style.width = '100%'
          canvas.className = 'rounded-2xl bg-white hairline'
          canvas.setAttribute('aria-label', `${name}, page ${n} sur ${pdf.numPages}`)
          canvas.setAttribute('role', 'img')
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
          if (cancelled) break
          box.appendChild(canvas)
          if (n === 1) setState('ready')
        }
        void pdf.destroy()
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
      box.replaceChildren()
    }
  }, [url, name])

  return (
    <>
      {state === 'loading' && <div className={`skeleton aspect-[1/1.41] rounded-2xl ${feature.soft}`} />}
      {state === 'error' && <p className="text-sm text-pink-deep">Le PDF n’a pas pu être affiché</p>}
      <div ref={container} className="flex flex-col gap-2" />
    </>
  )
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(url).then(r => r.text()).then(t => { if (!cancelled) setText(t) }, () => null)
    return () => { cancelled = true }
  }, [url])
  if (text === null) return <div className={`skeleton h-40 rounded-2xl ${feature.soft}`} />
  return <pre className="card whitespace-pre-wrap break-words text-sm font-sans">{text}</pre>
}

// Un document ouvert dans Hestia (plutôt qu'un nouvel onglet, qui ferait sortir de l'app installée) :
// son nom, ses infos, son contenu ; barre du bas : verrou, partager, télécharger, et sa fiche (…).
export default function DocumentViewer({ document, member, destinations, folderHref, lockAfterMinutes, me, shareLabel }: {
  document: HouseholdDocument
  member?: { name: string; avatarUrl: string | null }
  destinations: Destination[]
  me: string
  shareLabel: string | null
  folderHref: string
  lockAfterMinutes: number
}) {
  const router = useRouter()
  const { touch, outcome } = useAutoLock(lockAfterMinutes)
  const [sheet, setSheet] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const url = `/api/documents/${document.id}`

  // Partager le fichier lui-même (AirDrop, Messages, mail…) ; sinon, le télécharger
  async function share() {
    touch()
    setShareError(null)
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], document.name, { type: document.mimeType })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: document.name })
      else window.location.href = `${url}?download=1`
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) setShareError('Partage impossible')
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="font-display font-semibold text-2xl tracking-tight break-words">
          {document.name}
          {(document.privateTo || document.inPrivateFolder) && <><Icon name="lock" size={20} className="inline ml-2 align-[-0.1em] text-ink-muted" /><span className="sr-only">, privé</span></>}
        </h2>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          {member && <Avatar name={member.name} url={member.avatarUrl} size={24} />}
          <span>{formatSize(document.size)} · {formatDate(document.createdAt, true)}</span>
        </p>
        {shareError && <p role="alert" className="text-sm text-pink-deep">{shareError}</p>}
      </div>

      {document.mimeType === 'application/pdf' ? (
        <PdfPages url={url} name={document.name} />
      ) : IMAGES.includes(document.mimeType) ? (
        // eslint-disable-next-line @next/next/no-img-element -- fichier servi par notre route, derrière Face ID
        <img src={url} alt={document.name} className="w-full rounded-3xl bg-surface hairline" />
      ) : document.mimeType === 'text/plain' ? (
        <TextPreview url={url} />
      ) : (
        <div className="card py-12 flex flex-col items-center gap-4 text-center">
          <Icon name={iconFor(document.mimeType)} size={48} className={feature.text} />
          <a href={`${url}?download=1`} onClick={touch} className={`btn-feature ${feature.fill}`}>
            <Icon name="download" />
            Télécharger
          </a>
        </div>
      )}

      <ActionBar detached>
        <div className={barGroup}>
          <button type="button" onClick={() => lock()} className="icon-btn" aria-label="Verrouiller">
            <Icon name="lock" />
          </button>
        </div>
        <div className={barGroup}>
          <button type="button" onClick={share} className="icon-btn" aria-label="Partager">
            <Icon name="share" />
          </button>
          <a href={`${url}?download=1`} onClick={touch} className="icon-btn" aria-label="Télécharger">
            <Icon name="download" />
          </a>
          <button type="button" onClick={() => setSheet(true)} className="icon-btn" aria-label="Ranger, renommer ou supprimer">
            <Icon name="dots" />
          </button>
        </div>
      </ActionBar>

      {sheet && (
        <DocumentSheet
          document={document}
          destinations={destinations}
          me={me}
          shareLabel={shareLabel}
          onPrivacy={async isPrivate => {
            setSheet(false)
            const err = outcome(await setDocumentPrivate(document.id, isPrivate))
            if (err) setShareError(err)
          }}
          onRename={async name => { outcome(await renameDocument(document.id, name)) }}
          onMove={async target => {
            setSheet(false)
            const res = await moveDocuments([document.id], target)
            const err = outcome(res)
            if (err) setShareError(err)
            else if (res.ok && res.hrefs[document.id]) router.replace(res.hrefs[document.id])
          }}
          onTrash={async () => {
            setSheet(false)
            if (!outcome(await trashDocuments([document.id]))) router.push(folderHref)
          }}
          onClose={() => setSheet(false)}
        />
      )}
    </>
  )
}
