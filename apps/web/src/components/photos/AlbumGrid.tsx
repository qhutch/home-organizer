'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/ui/Icon'
import type { PhotoItem } from '@/lib/photos/synology'

const thumb = (album: string, item: PhotoItem, size: 'sm' | 'm' | 'xl') =>
  `/api/photos/thumb?${new URLSearchParams({ a: album, i: String(item.id), k: item.key, s: size })}`

// La plus petite taille prête pour la grille, la plus grande pour l'aperçu
const small = (item: PhotoItem) => item.previews[0] ?? null
const large = (item: PhotoItem) => item.previews[item.previews.length - 1] ?? null

// Le fichier d'origine, tel qu'il est sur le NAS
const original = (album: string, item: PhotoItem, download = false) =>
  `/api/photos/original?${new URLSearchParams({ a: album, i: String(item.id), ...(download ? { download: '1' } : {}) })}`

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

// Les photos d'un album en grille ; une photo touchée s'ouvre en grand par-dessus, sur fond noir.
// En la fermant, on retrouve l'album exactement là où on en était. Le retour du navigateur la ferme aussi.
export default function AlbumGrid({ album, items }: { album: string; items: PhotoItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const pushed = useRef(false)

  const close = useCallback(() => {
    setOpen(null)
    // On retire l'étape ajoutée à l'historique à l'ouverture
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    }
  }, [])

  function show(index: number) {
    if (open === null) {
      window.history.pushState({ photo: true }, '')
      pushed.current = true
    }
    setOpen(index)
  }

  // Retour du navigateur (ou glissé depuis le bord) : ferme l'aperçu au lieu de quitter l'album
  useEffect(() => {
    function onPop() {
      pushed.current = false
      setOpen(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <>
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`/photos/${album}/${item.id}`}
              onClick={e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return
                e.preventDefault()
                show(i)
              }}
              className="relative block aspect-square rounded-lg overflow-hidden bg-prune-soft"
            >
              {/* Icône dessous : elle reste visible si le NAS refuse la miniature (ex. photo d'un autre compte) */}
              <span className="absolute inset-0 grid place-items-center text-prune-deep"><Icon name={item.type === 'video' ? 'play' : 'photos'} size={28} /></span>
              {small(item) && (
                // eslint-disable-next-line @next/next/no-img-element -- miniature servie par notre route
                <img
                  src={thumb(album, item, small(item)!)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}
              {item.type === 'video' && (
                <span className="absolute bottom-1 right-1 rounded-full bg-ink/60 p-1 text-surface" aria-label="Vidéo"><Icon name="play" size={14} /></span>
              )}
            </a>
          </li>
        ))}
      </ul>
      {/* Dans <body> : au-dessus de tout, barre du bas comprise */}
      {open !== null && createPortal(
        <Lightbox album={album} items={items} index={open} onIndex={setOpen} onClose={close} />,
        document.body,
      )}
    </>
  )
}

function Lightbox({ album, items, index, onIndex, onClose }: {
  album: string
  items: PhotoItem[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}) {
  const item = items[index]
  const strip = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  // Photos que le NAS refuse de montrer (même en taille moyenne)
  const [failed, setFailed] = useState<Set<number>>(new Set())

  // La page de l'album ne défile pas derrière l'aperçu
  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  // À l'ouverture : on se place directement sur la photo touchée
  useEffect(() => {
    const el = strip.current
    if (el) el.scrollLeft = index * el.clientWidth
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement à l'ouverture
  }, [])

  const go = useCallback((target: number) => {
    const el = strip.current
    if (el && target >= 0 && target < items.length) el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' })
  }, [items.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(index - 1)
      if (e.key === 'ArrowRight') go(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, go, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={e => {
        if (!touch.current) return
        const dx = e.changedTouches[0].clientX - touch.current.x
        const dy = e.changedTouches[0].clientY - touch.current.y
        touch.current = null
        // Glisser vers le bas : fermer (de côté, c'est le défilement des photos)
        if (dy > 100 && Math.abs(dy) > Math.abs(dx) * 2) onClose()
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <p className="text-sm text-white/70">
          {item.type === 'video' ? 'Vidéo · ' : ''}{dateFormat.format(new Date(item.time * 1000))}
        </p>
        <button type="button" onClick={onClose} className="icon-btn text-white" aria-label="Fermer">
          <Icon name="close" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        {/* Bande de photos qui défile de côté (doigt, pavé tactile, molette horizontale), aimantée photo par photo */}
        <div
          ref={strip}
          className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={e => {
            const el = e.currentTarget
            const current = Math.round(el.scrollLeft / el.clientWidth)
            if (current !== index && current >= 0 && current < items.length) onIndex(current)
          }}
        >
          {items.map((photo, i) => (
            <div
              key={photo.id}
              className="w-full h-full shrink-0 snap-center snap-always flex items-center justify-center p-2"
              onClick={e => { if (e.target === e.currentTarget) onClose() }}
            >
              {/* Seules la photo affichée et ses voisines sont chargées */}
              {Math.abs(i - index) > 1 ? null : large(photo) && !failed.has(photo.id) ? (
                // eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route
                <img
                  src={thumb(album, photo, large(photo)!)}
                  alt=""
                  draggable={false}
                  className="max-w-full max-h-full object-contain select-none"
                  onError={e => {
                    const fallback = thumb(album, photo, 'm')
                    if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback
                    else setFailed(f => new Set(f).add(photo.id))
                  }}
                />
              ) : (
                <span className="flex flex-col items-center gap-2 text-white/70 text-sm">
                  <Icon name={photo.type === 'video' ? 'play' : 'photos'} size={40} />
                  Aperçu indisponible
                </span>
              )}
            </div>
          ))}
        </div>
        {index > 0 && (
          <button type="button" onClick={() => go(index - 1)} className="icon-btn text-white absolute left-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex" aria-label="Photo précédente">
            <Icon name="chevronLeft" />
          </button>
        )}
        {index < items.length - 1 && (
          <button type="button" onClick={() => go(index + 1)} className="icon-btn text-white absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex" aria-label="Photo suivante">
            <Icon name="chevronRight" />
          </button>
        )}
      </div>
      <SaveShare album={album} item={item} position={`${index + 1} / ${items.length}`} />
    </div>
  )
}

// Fichiers déjà préparés (la photo d'origine, ou sa grande version si l'origine ne passe pas)
const files = new Map<string, Promise<File>>()

function prepare(album: string, item: PhotoItem): Promise<File> {
  const id = `${album}/${item.id}`
  let file = files.get(id)
  if (!file) {
    file = (async () => {
      let response = await fetch(original(album, item))
      if (!response.ok) response = await fetch(thumb(album, item, large(item) ?? 'm'))
      if (!response.ok) throw new Error('photo indisponible')
      const blob = await response.blob()
      return new File([blob], item.filename.replace(/\.[^.]+$/, '') + (blob.type === 'image/jpeg' && !/\.jpe?g$/i.test(item.filename) ? '.jpg' : item.filename.match(/\.[^.]+$/)?.[0] ?? ''), { type: blob.type })
    })()
    file.catch(() => files.delete(id))
    files.set(id, file)
  }
  return file
}

// Barre du bas de l'aperçu : Enregistrer (dans la galerie de l'iPhone, ou téléchargé sur ordinateur) et Partager.
// La photo est préparée dès qu'elle s'affiche : l'iPhone n'ouvre son menu que si on l'appelle tout de suite après le toucher.
function SaveShare({ album, item, position }: { album: string; item: PhotoItem; position: string }) {
  const [message, setMessage] = useState<string | null>(null)
  // Le fichier préparé, avec la photo à laquelle il correspond
  const [prepared, setPrepared] = useState<{ id: number; file: File } | null>(null)
  const ready = prepared?.id === item.id ? prepared.file : null
  const [canShare] = useState(() =>
    typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] }))

  useEffect(() => {
    let alive = true
    prepare(album, item).then(file => { if (alive) setPrepared({ id: item.id, file }) }, () => {})
    return () => { alive = false }
  }, [album, item])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 2500)
    return () => clearTimeout(timer)
  }, [message])

  async function share(done: string) {
    if (!ready) return setMessage('La photo se prépare…')
    try {
      await navigator.share({ files: [ready] })
      setMessage(done)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setMessage('Partage impossible, réessaie')
    }
  }

  function save() {
    // Sur iPhone, le site ne peut pas écrire seul dans la galerie : son menu propose « Enregistrer l'image »
    if (canShare) return share('C’est fait')
    if (!ready) return setMessage('La photo se prépare…')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(ready)
    link.download = ready.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
    setMessage('Photo téléchargée')
  }

  return (
    <div className="relative flex items-center justify-between gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
      {message && (
        <p role="status" className="absolute left-1/2 -translate-x-1/2 -top-10 rounded-full bg-white/90 text-ink text-sm font-medium px-4 py-2 whitespace-nowrap">
          {message}
        </p>
      )}
      <button type="button" className="icon-btn text-white" aria-label="Enregistrer la photo" onClick={save}>
        <Icon name="download" />
      </button>
      <p className="text-xs text-white/60">{position}</p>
      {canShare ? (
        <button type="button" className="icon-btn text-white" aria-label="Partager la photo" onClick={() => share('Partagée')}>
          <Icon name="share" />
        </button>
      ) : <span className="icon-btn invisible" aria-hidden />}
    </div>
  )
}
