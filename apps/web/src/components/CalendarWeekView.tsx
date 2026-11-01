'use client'

import { useState, useEffect, useRef } from 'react'
import type { CalendarEvent } from '@/lib/google-calendar'

const HOUR_HEIGHT = 64 // px per hour
const START_HOUR = 7
const END_HOUR = 23
const TOTAL_HOURS = END_HOUR - START_HOUR

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_NAMES = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

function getWeekDays(ref: Date): Date[] {
  const day = ref.getDay()
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function eventStartDate(e: CalendarEvent) {
  return new Date(e.start.dateTime ?? e.start.date ?? '')
}

function isAllDay(e: CalendarEvent) {
  return !e.start.dateTime
}

function eventTop(e: CalendarEvent): number {
  if (!e.start.dateTime) return 0
  const d = new Date(e.start.dateTime)
  const minutes = (d.getHours() - START_HOUR) * 60 + d.getMinutes()
  return (minutes / 60) * HOUR_HEIGHT
}

function eventHeight(e: CalendarEvent): number {
  if (!e.start.dateTime || !e.end.dateTime) return HOUR_HEIGHT
  const start = new Date(e.start.dateTime)
  const end = new Date(e.end.dateTime)
  const durationMinutes = (end.getTime() - start.getTime()) / 60000
  return Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20)
}

function formatHour(h: number) {
  return `${h}:00`
}

function formatTime(e: CalendarEvent) {
  if (!e.start.dateTime) return 'Toute la journée'
  const s = new Date(e.start.dateTime)
  return s.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function WeekNav({ weekRef, onPrev, onNext }: { weekRef: Date; onPrev: () => void; onNext: () => void }) {
  const days = getWeekDays(weekRef)
  const first = days[0], last = days[6]
  const label = first.getMonth() === last.getMonth()
    ? `${first.getDate()} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`
    : `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`

  return (
    <div className="flex items-center gap-3">
      <button onClick={onPrev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-700 text-zinc-300 text-lg">‹</button>
      <span className="text-sm font-medium text-zinc-200 min-w-48 text-center">{label}</span>
      <button onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-700 text-zinc-300 text-lg">›</button>
    </div>
  )
}

// Mobile: day strip + list
function MobileView({ events, weekRef, onPrev, onNext }: { events: CalendarEvent[]; weekRef: Date; onPrev: () => void; onNext: () => void }) {
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(today)
  const weekDays = getWeekDays(weekRef)

  const dayEvents = events
    .filter(e => isSameDay(eventStartDate(e), selectedDay))
    .sort((a, b) => (a.start.dateTime ?? a.start.date ?? '').localeCompare(b.start.dateTime ?? b.start.date ?? ''))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <WeekNav weekRef={weekRef} onPrev={onPrev} onNext={onNext} />
      </div>
      <div className="grid grid-cols-7 gap-1 mb-6">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDay)
          const hasEvents = events.some(e => isSameDay(eventStartDate(e), day))
          return (
            <button key={i} onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${isSelected ? 'bg-zinc-100 text-zinc-900' : 'hover:bg-zinc-700'}`}>
              <span className={`text-xs ${isSelected ? 'text-zinc-500' : 'text-zinc-400'}`}>{DAY_NAMES_SHORT[i]}</span>
              <span className={`text-sm font-bold ${isToday && !isSelected ? 'underline underline-offset-2' : ''}`}>{day.getDate()}</span>
              <span className={`w-1 h-1 rounded-full ${hasEvents ? (isSelected ? 'bg-zinc-900' : 'bg-zinc-100') : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
        {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      {dayEvents.length === 0
        ? <p className="text-center text-zinc-400 text-sm py-10">Aucun événement ce jour</p>
        : <ul className="flex flex-col gap-2">{dayEvents.map(e => (
          <li key={e.id} className="bg-zinc-700 rounded-xl px-4 py-3 shadow-sm flex gap-3">
            <div className="w-0.5 bg-zinc-100 rounded-full shrink-0" />
            <div>
              <p className="text-sm font-medium">{e.summary}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{formatTime(e)}</p>
            </div>
          </li>
        ))}</ul>
      }
    </div>
  )
}

// Desktop: full time grid like Google Calendar
function DesktopView({ events, weekRef, onPrev, onNext }: { events: CalendarEvent[]; weekRef: Date; onPrev: () => void; onNext: () => void }) {
  const today = new Date()
  const weekDays = getWeekDays(weekRef)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date()
      const offset = (now.getHours() - START_HOUR - 1) * HOUR_HEIGHT
      scrollRef.current.scrollTop = Math.max(0, offset)
    }
  }, [])

  const now = new Date()
  const nowTop = ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT
  const showNowLine = now.getHours() >= START_HOUR && now.getHours() < END_HOUR

  const allDayEvents = events.filter(isAllDay)
  const timedEvents = events.filter(e => !isAllDay(e))

  const TIME_COL_W = 48

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <WeekNav weekRef={weekRef} onPrev={onPrev} onNext={onNext} />
      </div>

      {/* Day headers */}
      <div className="flex border-b border-zinc-700 pb-2 mb-0 shrink-0" style={{ paddingLeft: TIME_COL_W }}>
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={i} className="flex-1 text-center">
              <p className="text-xs text-zinc-400">{DAY_NAMES_SHORT[i]}</p>
              <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mt-0.5 ${isToday ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-100'}`}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-zinc-700/50 py-1 shrink-0" style={{ paddingLeft: TIME_COL_W }}>
          {weekDays.map((day, i) => {
            const dayAllDay = allDayEvents.filter(e => isSameDay(eventStartDate(e), day))
            return (
              <div key={i} className="flex-1 px-0.5 min-h-5">
                {dayAllDay.map(e => (
                  <div key={e.id} className="bg-zinc-600 text-white text-xs rounded px-1.5 py-0.5 truncate mb-0.5">
                    {e.summary}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>

          {/* Time labels */}
          <div className="shrink-0 relative" style={{ width: TIME_COL_W }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={i} className="absolute right-2 text-xs text-zinc-400"
                style={{ top: i * HOUR_HEIGHT - 8 }}>
                {formatHour(START_HOUR + i)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const isToday = isSameDay(day, today)
            const dayEvents = timedEvents.filter(e => isSameDay(eventStartDate(e), day))

            return (
              <div key={di} className={`flex-1 relative border-l border-zinc-700/50 ${isToday ? 'bg-blue-400/10' : ''}`}>
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div key={i} className="absolute w-full border-t border-zinc-700/50" style={{ top: i * HOUR_HEIGHT }} />
                ))}

                {/* Current time line */}
                {isToday && showNowLine && (
                  <div className="absolute w-full z-10 flex items-center" style={{ top: nowTop }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                    <div className="flex-1 border-t-2 border-red-500" />
                  </div>
                )}

                {/* Events */}
                {dayEvents.map(e => (
                  <div
                    key={e.id}
                    className="absolute left-0.5 right-0.5 bg-zinc-600 text-white rounded-md px-1.5 py-1 overflow-hidden z-20"
                    style={{ top: eventTop(e), height: eventHeight(e) }}
                  >
                    <p className="text-xs font-semibold leading-tight truncate">{e.summary}</p>
                    {eventHeight(e) > 30 && (
                      <p className="text-xs text-white/60 leading-tight mt-0.5">{formatTime(e)}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CalendarWeekView({ events }: { events: CalendarEvent[] }) {
  const today = new Date()
  const [weekRef, setWeekRef] = useState(today)

  function prevWeek() {
    const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d)
  }
  function nextWeek() {
    const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d)
  }

  return (
    <>
      <div className="md:hidden">
        <MobileView events={events} weekRef={weekRef} onPrev={prevWeek} onNext={nextWeek} />
      </div>
      <div className="hidden md:block">
        <DesktopView events={events} weekRef={weekRef} onPrev={prevWeek} onNext={nextWeek} />
      </div>
    </>
  )
}
