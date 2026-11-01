'use client'

import { useTransition } from 'react'
import { joinHousehold } from './actions'

export default function JoinButton({ householdId, token }: { householdId: string; token: string }) {
  const [isPending, startTransition] = useTransition()

  function handleJoin() {
    startTransition(async () => {
      await joinHousehold(householdId, token)
    })
  }

  return (
    <button
      onClick={handleJoin}
      disabled={isPending}
      className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Rejoindre...' : 'Rejoindre'}
    </button>
  )
}
