'use client'

import { useTransition } from 'react'
import { selectCalendar } from './actions'

type GoogleCalendar = {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

export default function CalendarPicker({ calendars, householdId }: {
  calendars: GoogleCalendar[]
  householdId: string
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
            className="w-full bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow disabled:opacity-50 text-left"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: cal.backgroundColor ?? '#333' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{cal.summary}</p>
              {cal.primary && <p className="text-xs text-gray-400">Principal</p>}
            </div>
            <span className="text-gray-300">›</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
