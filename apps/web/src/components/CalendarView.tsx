'use client'

import { useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '@/lib/google-calendar'
import { loadCalendarYear } from '@/app/(app)/calendar/actions'
import { FEATURES } from '@/lib/ui/features'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_NAMES = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

type Mode = 'week' | 'month'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// Même jour du mois suivant/précédent, ramené au dernier jour si besoin (31 → 30).
function addMonths(d: Date, n: number) {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate()
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), lastDay))
}

function mondayOf(d: Date) {
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7))
}

function getWeekDays(ref: Date): Date[] {
  const monday = mondayOf(ref)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// Semaines complètes (lundi → dimanche) couvrant le mois de ref.
function getMonthWeeks(ref: Date): Date[][] {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  const weeks: Date[][] = []
  for (let monday = mondayOf(first); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)))
  }
  return weeks
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

// Une date seule (« 2026-11-04 ») est un jour local, pas minuit en temps universel.
function parseEventDate(value: { dateTime?: string; date?: string }) {
  if (value.dateTime) return new Date(value.dateTime)
  const [y, m, d] = (value.date ?? '').split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Un événement apparaît sur chaque jour qu'il couvre (la fin est exclue).
function eventsOn(events: CalendarEvent[], day: Date) {
  const dayEnd = addDays(day, 1)
  return events
    .filter(e => parseEventDate(e.start) < dayEnd && parseEventDate(e.end) > startOfDay(day))
    .sort((a, b) => parseEventDate(a.start).getTime() - parseEventDate(b.start).getTime())
}

function formatTime(e: CalendarEvent) {
  if (!e.start.dateTime) return 'Journée'
  return new Date(e.start.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Ouvre Google Agenda sur un nouvel événement, à la date du jour sélectionné.
function newEventUrl(day: Date) {
  const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${ymd(day)}/${ymd(addDays(day, 1))}`
}

// Le titre de la période, sans l'année : elle a son propre choix juste à côté.
function periodLabel(mode: Mode, selected: Date) {
  if (mode === 'month') {
    return selected.toLocaleDateString('fr-FR', { month: 'long' })
  }
  const days = getWeekDays(selected)
  const first = days[0], last = days[6]
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`
    : `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`
}

// Les années couvertes par ce qui est affiché (une semaine peut en chevaucher deux).
function visibleYears(mode: Mode, selected: Date) {
  const days = mode === 'week' ? getWeekDays(selected) : getMonthWeeks(selected).flat()
  return [...new Set([days[0].getFullYear(), days[days.length - 1].getFullYear()])]
}

const YEARS_AROUND = 5

// Le menu natif du téléphone s'ouvre par-dessus l'année affichée.
function YearPicker({ selected, onChange }: { selected: Date; onChange: (year: number) => void }) {
  const current = new Date().getFullYear()
  const year = selected.getFullYear()
  const years = Array.from({ length: YEARS_AROUND * 2 + 1 }, (_, i) => current - YEARS_AROUND + i)
  if (!years.includes(year)) years.push(year)
  years.sort((a, b) => a - b)
  return (
    <label className="relative inline-flex items-center gap-0.5 font-display font-semibold text-lg tracking-tight rounded-lg hover:bg-coconut has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink px-1 cursor-pointer">
      {year}
      <Icon name="chevronDown" size={16} />
      <select
        aria-label="Année"
        value={year}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute inset-0 opacity-0 cursor-pointer text-base"
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </label>
  )
}

function DayEvents({ events, day }: { events: CalendarEvent[]; day: Date }) {
  const dayEvents = eventsOn(events, day)
  return (
    <div>
      <p className="eyebrow mb-3">
        {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      {dayEvents.length === 0
        ? <p className="card text-center text-ink-muted text-sm py-10">Aucun événement ce jour</p>
        : <ul className="flex flex-col gap-2">{dayEvents.map(e => (
          <li key={e.id} className={`${FEATURES.calendar.soft} rounded-3xl px-5 py-4 flex items-baseline gap-4`}>
            <p className="font-display font-semibold text-xl tracking-tight shrink-0 w-20 tabular-nums">{formatTime(e)}</p>
            <p className="text-sm font-medium min-w-0">{e.summary}</p>
          </li>
        ))}</ul>
      }
    </div>
  )
}

// Le vert olive plein est réservé à la date du jour ; le jour sélectionné porte un contour.
const SELECTED_RING = 'ring-2 ring-inset ring-olive-ink'

// « Rien de prévu » est centré dans toute la carte : sur téléphone, sa marge droite
// équilibre la colonne de la date.

// La semaine entière d'un coup d'œil : la carte de chaque jour contient ses événements.
// Colonnes sur ordinateur, cartes empilées sur téléphone.
function WeekCards({ events, selected, onSelect }: { events: CalendarEvent[]; selected: Date; onSelect: (d: Date) => void }) {
  const today = new Date()
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {getWeekDays(selected).map((day, i) => {
        const isSelected = isSameDay(day, selected)
        const isToday = isSameDay(day, today)
        const dayEvents = eventsOn(events, day)
        return (
          <section
            key={i}
            aria-label={day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            className={`rounded-3xl p-3 flex md:flex-col gap-3 md:min-h-72 ${isToday ? FEATURES.calendar.fill : 'bg-surface hairline'} ${isSelected && !isToday ? SELECTED_RING : ''}`}
          >
            <button onClick={() => onSelect(day)} aria-pressed={isSelected} className="w-12 md:w-auto shrink-0 self-start text-left rounded-2xl focus-visible:outline-2 focus-visible:outline-current">
              <span className={`block text-xs ${isToday ? '' : 'text-ink-muted'}`}>{DAY_NAMES_SHORT[i]}</span>
              <span className="block font-display font-semibold text-2xl leading-tight tracking-tight">
                {day.getDate()}
              </span>
            </button>
            {dayEvents.length > 0 ? (
              <ul className="flex flex-col gap-1.5 flex-1 min-w-0">
                {dayEvents.map(e => (
                  <li key={e.id} className={`rounded-2xl px-2.5 py-2 ${isToday ? 'card-inset !px-2.5 !py-2' : FEATURES.calendar.soft}`}>
                    <p className="text-xs">{formatTime(e)}</p>
                    <p className="text-sm font-medium leading-snug break-words">{e.summary}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`flex-1 self-stretch flex items-center justify-center text-center text-sm pr-15 md:pr-0 ${isToday ? '' : 'text-ink-muted'}`}>Rien de prévu</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

function MonthGrid({ events, selected, onSelect }: { events: CalendarEvent[]; selected: Date; onSelect: (d: Date) => void }) {
  const today = new Date()
  return (
    <div className="mb-6">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES_SHORT.map(d => <p key={d} className="text-xs text-ink-muted text-center">{d}</p>)}
      </div>
      <div className="flex flex-col gap-1">
        {getMonthWeeks(selected).map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              const isSelected = isSameDay(day, selected)
              const isToday = isSameDay(day, today)
              const inMonth = day.getMonth() === selected.getMonth()
              const dayEvents = eventsOn(events, day)
              return (
                <button key={di} onClick={() => onSelect(day)} aria-pressed={isSelected}
                  aria-label={`${day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${dayEvents.length} événement${dayEvents.length > 1 ? 's' : ''}`}
                  className={`min-h-14 md:min-h-24 rounded-2xl p-1.5 flex flex-col items-center md:items-start gap-1 text-left transition-colors ${
                    isToday ? FEATURES.calendar.fill : inMonth ? 'bg-surface hairline hover:bg-coconut' : 'hover:bg-coconut text-ink-muted'
                  } ${isSelected && !isToday ? SELECTED_RING : ''}`}>
                  <span className="text-sm font-bold">{day.getDate()}</span>
                  {/* Téléphone : des points ; ordinateur : les premiers titres */}
                  <span className="flex gap-0.5 md:hidden">
                    {dayEvents.slice(0, 3).map(e => (
                      <span key={e.id} className={`w-1 h-1 rounded-full ${isToday ? 'bg-current' : 'bg-moss'}`} />
                    ))}
                  </span>
                  <span className="hidden md:flex flex-col gap-0.5 w-full">
                    {dayEvents.slice(0, 2).map(e => (
                      <span key={e.id} className={`text-[11px] leading-tight truncate rounded-full px-1.5 py-0.5 ${isToday ? 'veil' : FEATURES.calendar.soft}`}>
                        {e.summary}
                      </span>
                    ))}
                    {dayEvents.length > 2 && <span className="text-[11px] px-1.5">+{dayEvents.length - 2}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Un jour reste toujours sélectionné : changer de semaine ou de mois déplace la sélection
// du même nombre de jours (ou au même jour du mois).
export default function CalendarView({ events: initialEvents }: { events: CalendarEvent[] }) {
  const [mode, setMode] = useState<Mode>('month')
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [events, setEvents] = useState(initialEvents)
  const loadedYears = useRef(new Set<number>())

  // La page ne reçoit que les mois proches : le reste se charge par année, à la demande.
  const yearsKey = visibleYears(mode, selected).join(',')
  useEffect(() => {
    for (const year of yearsKey.split(',').map(Number)) {
      if (loadedYears.current.has(year)) continue
      loadedYears.current.add(year)
      loadCalendarYear(year)
        .then(loaded => setEvents(prev => [...new Map([...prev, ...loaded].map(e => [e.id, e])).values()]))
        .catch(() => loadedYears.current.delete(year))
    }
  }, [yearsKey])

  // Même jour de la même période, ramené au dernier jour du mois si besoin (29 février).
  function changeYear(year: number) {
    setSelected(d => addMonths(d, (year - d.getFullYear()) * 12))
  }

  const step = (dir: 1 | -1) => setSelected(d => (mode === 'week' ? addDays(d, 7 * dir) : addMonths(d, dir)))

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 min-w-0">
          <p className="font-display font-semibold text-lg tracking-tight first-letter:uppercase truncate">
            {periodLabel(mode, selected)}
          </p>
          <YearPicker selected={selected} onChange={changeYear} />
        </div>
        <div className="flex items-center gap-0.5 -mr-2.5 shrink-0" role="group" aria-label="Changer de période">
          {!isSameDay(selected, new Date()) && (
            <button
              onClick={() => setSelected(startOfDay(new Date()))}
              aria-label="Revenir à aujourd’hui"
              className="icon-btn relative"
            >
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <rect x="4" y="6" width="22" height="20" rx="4" />
                <path d="M10 3v5M20 3v5" />
              </svg>
              <span className="absolute inset-x-0 top-[18px] text-center text-[12px] leading-none font-bold">{new Date().getDate()}</span>
            </button>
          )}
          <button onClick={() => step(-1)} aria-label={mode === 'week' ? 'Semaine précédente' : 'Mois précédent'} className="icon-btn">
            <Icon name="chevronLeft" />
          </button>
          <button onClick={() => step(1)} aria-label={mode === 'week' ? 'Semaine suivante' : 'Mois suivant'} className="icon-btn">
            <Icon name="chevronRight" />
          </button>
        </div>
      </div>

      {mode === 'month' ? (
        <>
          <MonthGrid events={events} selected={selected} onSelect={setSelected} />
          <DayEvents events={events} day={selected} />
        </>
      ) : (
        <WeekCards events={events} selected={selected} onSelect={setSelected} />
      )}

      <ActionBar detached>
        <div className={barGroup} role="group" aria-label="Affichage">
          {(['month', 'week'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-full px-4 h-11 text-sm font-medium transition-colors ${mode === m ? 'bg-ink text-surface' : 'hover:bg-coconut'}`}
            >
              {m === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
        <a href={newEventUrl(selected)} target="_blank" rel="noreferrer" aria-label="Nouvel événement dans Google Agenda" className={`icon-btn-fill icon-btn-lg ${FEATURES.calendar.fill}`}>
          <Icon name="plus" />
        </a>
      </ActionBar>
    </>
  )
}
