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
      className="btn w-full"
    >
      {isPending ? 'Rejoindre...' : 'Rejoindre'}
    </button>
  )
}
