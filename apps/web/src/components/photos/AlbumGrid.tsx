'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import type { PhotoItem } from '@/lib/photos/synology'

// Une photo de l'album avec les liens (signés par le serveur) de ses miniatures prêtes
export type GridItem = PhotoItem & { links: Partial<Record<'sm' | 'm' | 'xl', string>> }

// La plus petite taille prête pour la grille, la plus grande pour l'aperçu
const small = (item: GridItem) => item.links[item.previews[0]] ?? null
const large = (item: GridItem) => item.links[item.previews[item.previews.length - 1]] ?? null

// Le fichier d'origine, tel qu'il est sur le NAS
const original = (album: string, item: GridItem, download = false) =>
  `/api/photos/original?${new URLSearchParams({ a: album, i: String(item.id), ...(download ? { download: '1' } : {}) })}`

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

// Les photos d'un album en grille ; une photo touchée s'ouvre en grand par-dessus, sur fond noir.
// En la fermant, on retrouve l'album exactement là où on en était. Le retour du navigateur la ferme aussi.
export default function AlbumGrid({ album, items }: { album: string; items: GridItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const pushed = useRef(false)
  // Au plus 50 photos d'un coup : chaque photo d'origine est chargée dans le téléphone avant le partage
const MAX_CHOSEN = 50

// Mode « Choisir » : plusieurs photos à enregistrer ou partager d'un coup (ids sélectionnés)
  const [choosing, setChoosing] = useState(false)
  const [chosen, setChosen] = useState<Set<number>>(new Set())

  function toggle(item: GridItem) {
    setChosen(c => {
      const next = new Set(c)
      if (next.has(item.id)) next.delete(item.id)
      else if (next.size < MAX_CHOSEN) {
        next.add(item.id)
        prepare(album, item).catch(() => {})
      }
      return next
    })
  }

  // Tout sélectionner : les 50 premières photos de l'album
  const all = items.slice(0, MAX_CHOSEN)
  function chooseAll() {
    if (chosen.size === all.length) return setChosen(new Set())
    all.forEach(item => prepare(album, item).catch(() => {}))
    setChosen(new Set(all.map(i => i.id)))
  }

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
      <div className="flex justify-end gap-2 mb-2">
        {choosing && (
          <button type="button" className="pill text-prune-deep" onClick={chooseAll}>
            {chosen.size === all.length ? 'Tout désélectionner' : items.length > MAX_CHOSEN ? `Les ${MAX_CHOSEN} premières` : 'Tout sélectionner'}
          </button>
        )}
        <button
          type="button"
          className="pill text-prune-deep"
          onClick={() => { setChoosing(c => !c); setChosen(new Set()) }}
        >
          {choosing ? 'Annuler' : 'Choisir'}
        </button>
      </div>
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`/photos/${album}/${item.id}`}
              onClick={e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return
                e.preventDefault()
                if (choosing) toggle(item)
                else show(i)
              }}
              className="relative block aspect-square rounded-lg overflow-hidden bg-prune-soft"
            >
              {/* Icône dessous : elle reste visible si le NAS refuse la miniature (ex. photo d'un autre compte) */}
              <span className="absolute inset-0 grid place-items-center text-prune-deep"><Icon name={item.type === 'video' ? 'play' : 'photos'} size={28} /></span>
              {small(item) && (
                // eslint-disable-next-line @next/next/no-img-element -- miniature servie par notre route
                <img
                  src={small(item)!}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}
              {item.type === 'video' && (
                <span className="absolute bottom-1 right-1 rounded-full bg-ink/60 p-1 text-surface" aria-label="Vidéo"><Icon name="play" size={14} /></span>
              )}
              {choosing && (
                <span
                  className={`absolute top-1 right-1 size-6 rounded-full grid place-items-center border-2 border-white ${chosen.has(item.id) ? 'bg-prune text-white' : 'bg-ink/30'}`}
                  aria-hidden
                >
                  {chosen.has(item.id) && <Icon name="check" size={16} />}
                </span>
              )}
              {choosing && chosen.has(item.id) && <span className="absolute inset-0 ring-4 ring-inset ring-prune rounded-lg" aria-hidden />}
            </a>
          </li>
        ))}
      </ul>
      {choosing && createPortal(
        <ChosenBar album={album} items={items.filter(i => chosen.has(i.id))} onDone={() => { setChoosing(false); setChosen(new Set()) }} />,
        document.body,
      )}
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
  items: GridItem[]
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
                  src={large(photo)!}
                  alt=""
                  draggable={false}
                  className="max-w-full max-h-full object-contain select-none"
                  onError={e => {
                    const fallback = photo.links.m
                    if (fallback && !e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback
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

function prepare(album: string, item: GridItem): Promise<File> {
  const id = `${album}/${item.id}`
  let file = files.get(id)
  if (!file) {
    file = (async () => {
      let response = await fetch(original(album, item))
      const fallback = large(item)
      if (!response.ok && fallback) response = await fetch(fallback)
      if (!response.ok) throw new Error('photo indisponible')
      const blob = await response.blob()
      return new File([blob], item.filename.replace(/\.[^.]+$/, '') + (blob.type === 'image/jpeg' && !/\.jpe?g$/i.test(item.filename) ? '.jpg' : item.filename.match(/\.[^.]+$/)?.[0] ?? ''), { type: blob.type })
    })()
    file.catch(() => files.delete(id))
    files.set(id, file)
  }
  return file
}

// Barre du bas de l'aperçu : un seul bouton, Enregistrer ou partager (sur iPhone, son menu de partage), ou Télécharger.
// La photo est préparée dès qu'elle s'affiche : l'iPhone n'ouvre son menu que si on l'appelle tout de suite après le toucher.
function SaveShare({ album, item, position }: { album: string; item: GridItem; position: string }) {
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
      {/* Un seul bouton : sur iPhone, le menu de partage propose aussi « Enregistrer l'image » ; ailleurs, téléchargement */}
      <span className="icon-btn invisible" aria-hidden />
      <p className="text-xs text-white/60">{position}</p>
      <button type="button" className="icon-btn text-white" aria-label={canShare ? 'Enregistrer ou partager' : 'Télécharger'} onClick={save}>
        <Icon name={canShare ? 'share' : 'download'} />
      </button>
    </div>
  )
}

// Barre du mode « Choisir » : enregistrer ou partager toutes les photos choisies d'un coup.
// Les photos se préparent dès qu'on les coche ; le bouton attend qu'elles soient toutes prêtes
// (l'iPhone n'ouvre son menu que juste après le toucher).
function ChosenBar({ album, items, onDone }: { album: string; items: GridItem[]; onDone: () => void }) {
  const [ready, setReady] = useState<Map<number, File>>(new Map())
  const [message, setMessage] = useState<string | null>(null)
  const [canShare] = useState(() =>
    typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] }))

  useEffect(() => {
    let alive = true
    for (const item of items) {
      prepare(album, item).then(file => { if (alive) setReady(r => r.has(item.id) ? r : new Map(r).set(item.id, file)) }, () => {})
    }
    return () => { alive = false }
  }, [album, items])

  const files = items.map(i => ready.get(i.id)).filter((f): f is File => !!f)
  const allReady = items.length > 0 && files.length === items.length

  async function go() {
    if (!allReady) return
    if (canShare) {
      try {
        await navigator.share({ files })
        setMessage('C’est fait')
        setTimeout(onDone, 1200)
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setMessage('Partage impossible, réessaie')
      }
      return
    }
    for (const file of files) {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(file)
      link.download = file.name
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
    }
    setMessage(`${files.length} ${files.length > 1 ? 'photos téléchargées' : 'photo téléchargée'}`)
    setTimeout(onDone, 1200)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {message && <p role="status" className="rounded-full bg-ink text-surface text-sm font-medium px-4 py-2">{message}</p>}
      <button type="button" className={`btn-feature btn-lg w-full max-w-lg ${FEATURES.photos.fill}`} disabled={!allReady} onClick={go}>
        <Icon name={canShare ? 'share' : 'download'} />
        {items.length === 0 ? 'Choisis des photos'
          : !allReady ? `Préparation… ${files.length} / ${items.length}`
            : `${canShare ? 'Enregistrer ou partager' : 'Télécharger'} ${items.length} ${items.length > 1 ? 'photos' : 'photo'}`}
      </button>
    </div>
  )
}
