'use client'

import { useTransition } from 'react'
import { selectCalendar } from './actions'

type GoogleCalendar = {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

export default function CalendarPicker({ calendars }: {
  calendars: GoogleCalendar[]
}) {
  const [isPending, startTransition] = useTransition()

  function handleSelect(cal: GoogleCalendar) {
    startTransition(async () => {
      await selectCalendar(cal.id, cal.summary)
    })
  }

  return (
    <ul className="flex flex-col gap-2">
      {calendars.map(cal => (
        <li key={cal.id}>
          <button
            onClick={() => handleSelect(cal)}
            disabled={isPending}
            className="card w-full flex items-center gap-3"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: cal.backgroundColor ?? '#333' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{cal.summary}</p>
              {cal.primary && <p className="text-xs text-ink-muted">Principal</p>}
            </div>
            <span className="text-ink-muted">›</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
