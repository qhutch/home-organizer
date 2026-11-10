'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { PHOTO_RATIO, cropPhoto } from '@/lib/recipes/photo'
import { FEATURES } from '@/lib/ui/features'

const MAX_ZOOM = 4

// En pixels du cadre : x, y = coin haut gauche de la photo
type View = { zoom: number; x: number; y: number }
// Ce qu'on garde : le point de la photo au centre du cadre (0 à 1), pour rester juste si le cadre change de taille
type Center = { zoom: number; cx: number; cy: number }

// Recadrage d'une photo au format 4:3 de l'écran : on la fait glisser dans le cadre,
// on zoome en pinçant, à la molette ou avec le curseur, et on la fait pivoter d'un quart de tour.
// onDone reçoit la photo recadrée.
export default function PhotoCropper({ src, onDone, onCancel, pending }: {
  src: string
  onDone: (photo: Blob) => void
  onCancel: () => void
  pending: boolean
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [frame, setFrame] = useState({ width: 0, height: 0 })
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [center, setCenter] = useState<Center>({ zoom: 1, cx: 0.5, cy: 0.5 })
  const [error, setError] = useState<string | null>(null)
  // Photo pivotée (dessinée dans le navigateur) ; null = celle d'origine
  const [rotated, setRotated] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  // Échelle à zoom 1 : la photo couvre juste le cadre
  const cover = natural.width ? Math.max(frame.width / natural.width, frame.height / natural.height) : 0

  function toView(c: Center): View {
    const scale = cover * c.zoom
    return { zoom: c.zoom, x: frame.width / 2 - c.cx * natural.width * scale, y: frame.height / 2 - c.cy * natural.height * scale }
  }

  function toCenter(v: View): Center {
    const scale = cover * v.zoom
    return { zoom: v.zoom, cx: (frame.width / 2 - v.x) / (natural.width * scale), cy: (frame.height / 2 - v.y) / (natural.height * scale) }
  }

  // Toutes les retouches se font en pixels, puis repassent par clamp
  function setView(change: (v: View) => View) {
    if (!cover) return
    setCenter(c => toCenter(clamp(change(clamp(toView(c))))))
  }

  // Garde la photo sur tout le cadre (pas de bord vide)
  function clamp(next: View): View {
    const zoom = Math.min(Math.max(next.zoom, 1), MAX_ZOOM)
    const scale = cover * zoom
    return {
      zoom,
      x: Math.min(0, Math.max(frame.width - natural.width * scale, next.x)),
      y: Math.min(0, Math.max(frame.height - natural.height * scale, next.y)),
    }
  }

  // Zoome autour d'un point du cadre (le centre par défaut), qui reste sous le doigt
  function zoomTo(view: View, zoom: number, at = { x: frame.width / 2, y: frame.height / 2 }): View {
    const ratio = Math.min(Math.max(zoom, 1), MAX_ZOOM) / view.zoom
    return clamp({ zoom: view.zoom * ratio, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio })
  }

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setFrame({ width: el.clientWidth, height: el.clientHeight }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function point(e: React.PointerEvent) {
    const box = frameRef.current!.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, point(e))
  }

  function onPointerMove(e: React.PointerEvent) {
    const before = pointers.current.get(e.pointerId)
    if (!before) return
    const now = point(e)
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)
    pointers.current.set(e.pointerId, now)
    if (others.length === 0) {
      setView(v => clamp({ ...v, x: v.x + now.x - before.x, y: v.y + now.y - before.y }))
    } else {
      // Pincer : l'écart entre les deux doigts donne le zoom
      const other = others[0]
      const ratio = Math.hypot(now.x - other.x, now.y - other.y) / (Math.hypot(before.x - other.x, before.y - other.y) || 1)
      const middle = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 }
      setView(v => zoomTo(v, v.zoom * ratio, middle))
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
  }

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    // La molette zoome sans faire défiler la page (d'où un écouteur non passif)
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const box = el!.getBoundingClientRect()
      const at = { x: e.clientX - box.left, y: e.clientY - box.top }
      setView(v => zoomTo(v, v.zoom * Math.exp(-e.deltaY / 300), at))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  // Quart de tour vers la droite : la photo est redessinée tournée, et le recadrage repart du centre
  async function rotate() {
    const image = imageRef.current
    if (!image || !natural.width || rotating) return
    setRotating(true)
    const canvas = document.createElement('canvas')
    canvas.width = natural.height
    canvas.height = natural.width
    const context = canvas.getContext('2d')!
    context.translate(canvas.width, 0)
    context.rotate(Math.PI / 2)
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95))
    setRotating(false)
    if (!blob) return
    if (rotated) URL.revokeObjectURL(rotated)
    setNatural({ width: 0, height: 0 })
    setCenter({ zoom: 1, cx: 0.5, cy: 0.5 })
    setRotated(URL.createObjectURL(blob))
  }

  async function done() {
    const image = imageRef.current
    if (!image || !cover) return
    const scale = cover * view.zoom
    setError(null)
    try {
      onDone(await cropPhoto(image, { x: -view.x / scale, y: -view.y / scale, width: frame.width / scale, height: frame.height / scale }))
    } catch {
      setError('Impossible de recadrer cette photo.')
    }
  }

  const view = cover ? clamp(toView(center)) : { zoom: 1, x: 0, y: 0 }
  const scale = cover * view.zoom

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ aspectRatio: PHOTO_RATIO }}
        className="relative w-full overflow-hidden rounded-3xl bg-coconut touch-none cursor-grab active:cursor-grabbing select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route */}
        <img
          ref={el => {
            imageRef.current = el
            // Déjà chargée (photo en cache) : onLoad ne viendra pas
            if (el?.complete && el.naturalWidth && !natural.width) setNatural({ width: el.naturalWidth, height: el.naturalHeight })
          }}
          src={rotated ?? src}
          alt=""
          draggable={false}
          onLoad={e => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
          style={{ width: natural.width * scale || undefined, height: natural.height * scale || undefined, transform: `translate(${view.x}px, ${view.y}px)` }}
          className={`absolute left-0 top-0 max-w-none ${cover ? '' : 'invisible'}`}
        />
      </div>

      <div className="flex items-center gap-3 px-1 text-ink-muted">
        <Icon name="minus" size={18} />
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={e => setView(v => zoomTo(v, Number(e.target.value)))}
          aria-label="Zoom"
          className="flex-1 accent-pink-deep"
        />
        <Icon name="plus" size={18} />
        <button type="button" onClick={rotate} disabled={rotating || !cover} className="icon-btn ml-1 text-ink" aria-label="Pivoter d’un quart de tour" title="Pivoter">
          <Icon name="rotate" />
        </button>
      </div>

      {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={pending} className="btn-outline flex-1">Annuler</button>
        <button type="button" onClick={done} disabled={pending || !cover} className={`btn-feature flex-1 ${FEATURES.recipes.fill}`}>
          <Icon name="check" size={20} /> {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
