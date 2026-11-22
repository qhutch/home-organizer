'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { formatCountdown, formatDuration, type StepTimer } from '@/lib/recipes/cook'

// Minuteurs du mode cuisine, tenus par toute l'app (layout de (app)) : ils continuent de tourner et de
// sonner quand on quitte le mode cuisine pour une autre page d'Hestia, et sont gardés dans le téléphone
// (localStorage) pour survivre à un rechargement. Ailleurs que sur leur page, une petite pastille en bas
// à droite les rappelle et y ramène.

// `where` : la recette du minuteur (batch cooking, sinon « Étape N ») ; `href` : la page où on l'a lancé
type Timer = { id: number; step: number; seconds: number; label: string | null; where: string | null; href: string; endsAt: number }

const STORAGE_KEY = 'hestia.cookTimers'
// Un minuteur qui sonne depuis plus longtemps est oublié (on l'a laissé sonner en partant)
const FORGET_AFTER = 60 * 60 * 1000

function readSaved(): Timer[] {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Timer[]
    return Array.isArray(list) ? list.filter(t => typeof t?.endsAt === 'number' && t.endsAt > Date.now() - FORGET_AFTER) : []
  } catch {
    return []
  }
}

function useTimersState() {
  const pathname = usePathname()
  const [list, setList] = useState<Timer[]>([])
  const [now, setNow] = useState(() => Date.now())
  const audio = useRef<AudioContext | null>(null)
  const loaded = useRef(false)

  // Au démarrage, les minuteurs gardés dans le téléphone
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage n'existe que dans le navigateur
    setList(readSaved())
    loaded.current = true
  }, [])
  useEffect(() => {
    if (!loaded.current) return
    try {
      if (list.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [list])

  useEffect(() => {
    if (!list.length) return
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick)
  }, [list.length])

  // Le son ne peut être préparé que pendant un toucher (règle des navigateurs, surtout sur iPhone) :
  // après un rechargement, le premier toucher le prépare de nouveau.
  function prepareAudio() {
    try {
      audio.current ??= new AudioContext()
      void audio.current.resume()
    } catch {}
  }
  useEffect(() => {
    if (!list.length || audio.current) return
    window.addEventListener('pointerdown', prepareAudio, { once: true })
    return () => window.removeEventListener('pointerdown', prepareAudio)
  }, [list.length])

  // À la fin, ça sonne (et vibre si le téléphone sait le faire) toutes les 3 s, jusqu'à ce qu'on l'arrête
  const ringing = list.some(t => t.endsAt <= now)
  useEffect(() => {
    if (!ringing) return
    let rings = 0
    function ring() {
      if (rings++ >= 20) return
      navigator.vibrate?.([300, 150, 300])
      const ctx = audio.current
      if (!ctx) return
      const t = ctx.currentTime
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, t + i * 0.3)
        gain.gain.exponentialRampToValueAtTime(0.4, t + i * 0.3 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.3 + 0.2)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t + i * 0.3)
        osc.stop(t + i * 0.3 + 0.22)
      }
    }
    ring()
    const again = setInterval(ring, 3000)
    return () => clearInterval(again)
  }, [ringing])

  return {
    list,
    now,
    pathname,
    start(step: number, seconds: number, label: string | null, where: string | null = null) {
      prepareAudio()
      const start = Date.now()
      setNow(start)
      setList(l => [...l, { id: Math.max(0, ...l.map(t => t.id)) + 1, step, seconds, label, where, href: pathname, endsAt: start + seconds * 1000 }])
    },
    // Rajouter du temps (« + 1 min ») ; sur un minuteur qui sonne, repart de maintenant
    extend(id: number, seconds: number) {
      const at = Date.now()
      setNow(at)
      setList(l => l.map(t => (t.id === id ? { ...t, seconds: t.seconds + seconds, endsAt: Math.max(t.endsAt, at) + seconds * 1000 } : t)))
    },
    stop: (id: number) => setList(l => l.filter(t => t.id !== id)),
  }
}

type Timers = ReturnType<typeof useTimersState>

const TimersContext = createContext<Timers | null>(null)

export function CookTimersProvider({ children }: { children: React.ReactNode }) {
  const timers = useTimersState()
  return (
    <TimersContext.Provider value={timers}>
      {children}
      <ElsewherePill timers={timers} />
    </TimersContext.Provider>
  )
}

export function useTimers() {
  const timers = useContext(TimersContext)
  if (!timers) throw new Error('useTimers : CookTimersProvider manque')
  return timers
}

const leftOf = (t: Timer, now: number) => (t.endsAt - now) / 1000
// Le plus urgent d'abord : ceux qui sonnent, puis celui qui finit le plus tôt
const byUrgency = (a: Timer, b: Timer) => a.endsAt - b.endsAt

// Hors de la page des minuteurs : une pastille en bas à droite (le plus urgent, et combien d'autres),
// qui ramène au mode cuisine. Rose plein quand l'un d'eux sonne.
function ElsewherePill({ timers }: { timers: Timers }) {
  // Le mode cuisine montre déjà tous les minuteurs, au-dessus de « Étape suivante »
  if (timers.pathname.endsWith('/cuisiner')) return null
  const away = [...timers.list].sort(byUrgency)
  if (!away.length) return null
  const first = away[0]
  const left = leftOf(first, timers.now)
  const ringing = left <= 0
  return (
    <Link
      href={first.href}
      className={`fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-40 h-10 pl-3 pr-4 rounded-full flex items-center gap-1.5 text-sm font-semibold ${ringing ? `${FEATURES.recipes.fill} motion-safe:animate-pulse` : 'bg-surface hairline'}`}
      aria-label={`Minuteur ${ringing ? 'terminé' : formatCountdown(left)} : revenir au mode cuisine`}
    >
      <Icon name="timer" size={20} />
      <span className="tabular-nums">{ringing ? 'Terminé' : formatCountdown(left)}</span>
      {away.length > 1 && <span className="text-xs opacity-70">+{away.length - 1}</span>}
    </Link>
  )
}

// Au-dessus de « Étape suivante », dans la barre collée en bas (on ne peut pas faire défiler dessus) :
// un petit bouton par durée de l'étape affichée pas encore lancée, et à droite les minuteurs en cours en
// anneaux (Ring). Toucher un anneau ouvre sa fiche (temps, + 1 min, arrêter). Un minuteur qui sonne
// devient une grande pilule rose plein qui dit lequel c'est (recette, ce qu'il chronomètre).
// `where` : la recette de l'étape affichée (batch cooking), gardée avec les minuteurs qu'on y lance.
export function TimerTray({ timers, step, durations, where = null }: { timers: Timers; step: number | null; durations: StepTimer[]; where?: string | null }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const available = step === null ? [] : durations.filter(d => !timers.list.some(t => t.href === timers.pathname && t.step === step && t.seconds === d.seconds))
  const sorted = [...timers.list].sort(byUrgency)
  const ringingList = sorted.filter(t => leftOf(t, timers.now) <= 0)
  const running = sorted.filter(t => leftOf(t, timers.now) > 0)
  const open = timers.list.find(t => t.id === openId) ?? null
  if (!timers.list.length && !available.length) return null
  return (
    <div className="flex flex-col gap-2 mb-2" aria-label="Minuteurs">
      {(running.length > 0 || available.length > 0) && (
        // Une seule ligne : les durées à lancer à gauche, les minuteurs en cours en anneaux à droite, le plus
        // urgent tout à droite, au-dessus de « Étape suivante ». S'il y en a trop, la ligne en plus va au-dessus.
        <ul className="flex flex-wrap-reverse items-center gap-2">
          {available.map(({ seconds, label }) => (
            <li key={`start-${seconds}`}>
              <button type="button" onClick={() => step !== null && timers.start(step, seconds, label, where)} aria-label={`Lancer un minuteur de ${formatDuration(seconds)}`} className={`btn-feature-outline btn-md ${FEATURES.recipes.text}`}>
                <Icon name="timer" /> {formatDuration(seconds)}
              </button>
            </li>
          ))}
          {[...running].reverse().map((t, i) => (
            <li key={t.id} role="timer" className={i === 0 ? 'ml-auto' : ''}>
              <Ring timer={t} left={leftOf(t, timers.now)} onOpen={() => setOpenId(t.id)} />
            </li>
          ))}
        </ul>
      )}
      {ringingList.map(t => (
        <div key={t.id} role="timer" className={`rounded-full h-16 pl-5 pr-2.5 flex items-center gap-2.5 motion-safe:animate-pulse ${FEATURES.recipes.fill}`}>
          <Icon name="timer" size={24} className="shrink-0" />
          {/* Deux lignes, pour tenir dans les 64px : d'abord ce qu'il chronomètre (« Faites cuire à feu
              très doux »), en gros, puis « Terminé » et la recette */}
          <span className="flex-1 min-w-0 leading-tight">
            <span className="block font-display font-semibold text-lg truncate first-letter:uppercase">{t.label ?? 'Terminé'}</span>
            <span className="block text-sm truncate">{[t.label && 'Terminé', t.where ?? `Étape ${t.step}`].filter(Boolean).join(' · ')}</span>
          </span>
          <button type="button" onClick={() => timers.extend(t.id, 60)} className="btn btn-md shrink-0 !px-3 bg-surface text-ink">+ 1 min</button>
          <button type="button" onClick={() => timers.stop(t.id)} aria-label="Arrêter la sonnerie" title="Arrêter la sonnerie" className="icon-btn bg-surface text-ink">
            <Icon name="check" />
          </button>
        </div>
      ))}
      {open && <TimerSheet timer={open} timers={timers} onClose={() => setOpenId(null)} />}
    </div>
  )
}

// Un minuteur en cours, en anneau de 44px (la hauteur des boutons « 25 min » à côté) qui se vide :
// au centre, seulement le nombre de minutes qui restent (« 45s » pendant la dernière minute).
// Le toucher ouvre sa fiche (ce qu'il chronomètre, la recette, + 1 min, arrêter).
function Ring({ timer, left, onOpen }: { timer: Timer; left: number; onOpen: () => void }) {
  const r = 19.5
  const length = 2 * Math.PI * r
  const share = Math.max(0, Math.min(1, left / timer.seconds))
  const lastMinute = left < 60
  const name = [timer.where, timer.label ?? `Étape ${timer.step}`].filter(Boolean).join(' · ')
  return (
    <button type="button" onClick={onOpen} aria-label={`${name} : ${formatCountdown(left)}`} title={name} className="relative w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-surface">
      <svg viewBox="0 0 44 44" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" className="stroke-pink-soft" />
        <circle
          cx="22" cy="22" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={length} strokeDashoffset={length * (1 - share)}
          className="stroke-rose transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="relative font-display font-semibold text-[15px] leading-none tabular-nums" aria-hidden="true">
        {lastMinute ? <>{Math.ceil(left)}<span className="text-[10px] font-sans">s</span></> : Math.ceil(left / 60)}
      </span>
    </button>
  )
}

// La fiche d'un minuteur : ce qu'il chronomètre, le temps restant en grand, + 1 min, arrêter
function TimerSheet({ timer, timers, onClose }: { timer: Timer; timers: Timers; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  const left = leftOf(timer, timers.now)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="timer-title">
      <button type="button" aria-label="Fermer" onClick={onClose} data-veil className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-1 min-w-0">
            {timer.where && <p className="eyebrow truncate">{timer.where}</p>}
            <h3 id="timer-title" className="font-display font-semibold text-2xl tracking-tight first-letter:uppercase">{timer.label ?? `Étape ${timer.step}`}</h3>
          </div>
          <button type="button" onClick={onClose} className="icon-btn icon-btn-lg" aria-label="Fermer"><Icon name="close" /></button>
        </div>
        <p className="font-display font-semibold text-6xl tabular-nums text-center my-6" role="timer">{left <= 0 ? 'Terminé' : formatCountdown(left)}</p>
        <p className="text-center text-ink-muted mb-6">Minuteur de {formatDuration(timer.seconds)}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => { timers.stop(timer.id); onClose() }} className="btn-danger btn-lg flex-1">Arrêter</button>
          <button type="button" onClick={() => timers.extend(timer.id, 60)} className={`btn-feature-outline btn-lg flex-1 ${FEATURES.recipes.text}`}>+ 1 min</button>
        </div>
      </div>
    </div>
  )
}
