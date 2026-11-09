'use client'

import { useRef } from 'react'
import Emoji from '@/components/ui/Emoji'

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE_PX = 10

type Variant = 'inList' | 'recent' | 'suggestion' | 'new'

const VARIANT_CLASSES: Record<Variant, string> = {
  inList: 'bg-surface text-ink hover:bg-coconut/40',
  recent: 'bg-transparent text-ink-muted border-2 border-dashed border-line hover:border-ink-muted',
  suggestion: 'bg-surface text-ink border border-line hover:border-ink-muted',
  new: 'bg-surface text-ink border-2 border-dashed border-line hover:border-ink-muted',
}

export default function ItemTile({
  emoji,
  name,
  detail,
  variant,
  badge,
  onTap,
  onLongPress,
}: {
  emoji: string
  name: string
  detail?: string | null
  variant: Variant
  badge?: string
  onTap: () => void
  onLongPress?: () => void
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const longPressed = useRef(false)

  function cancel() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    start.current = null
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!onLongPress || e.button !== 0) return
    longPressed.current = false
    start.current = { x: e.clientX, y: e.clientY }
    timer.current = setTimeout(() => {
      longPressed.current = true
      timer.current = null
      onLongPress()
    }, LONG_PRESS_MS)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!start.current) return
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE_PX) cancel()
  }

  function handleClick() {
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    onTap()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={e => {
        if (!onLongPress) return
        e.preventDefault()
        cancel()
        onLongPress()
      }}
      style={{ WebkitTouchCallout: 'none' }}
      // Carrée par défaut ; grandit en hauteur quand le texte prend plus de place (3 lignes max chacun).
      className={`relative aspect-square h-auto rounded-3xl p-2 flex flex-col items-center justify-center gap-1 text-center select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-moss ${VARIANT_CLASSES[variant]}`}
    >
      {badge && (
        <span className="absolute top-1.5 right-1.5 text-[10px] leading-none font-semibold bg-ink/10 rounded-full px-1.5 py-1">
          {badge}
        </span>
      )}
      <Emoji name={emoji} size={40} className={variant === 'recent' ? 'opacity-60' : ''} />
      <span className="text-[14px] font-semibold leading-tight line-clamp-3 break-words w-full">{name}</span>
      {detail && <span className="text-[12px] leading-tight opacity-70 line-clamp-3 break-words w-full">{detail}</span>}
    </button>
  )
}
