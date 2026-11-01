'use client'

import { useTransition } from 'react'
import { removeMember } from './actions'

type Member = {
  userId: string
  role: 'owner' | 'member'
  displayName: string | null
}

export default function HouseholdMembers({ members, householdId, currentUserId, isOwner }: {
  members: Member[]
  householdId: string
  currentUserId: string
  isOwner: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove(userId: string) {
    if (!confirm('Retirer ce membre du foyer ?')) return
    startTransition(async () => {
      await removeMember(userId, householdId)
    })
  }

  function initials(member: Member) {
    if (member.displayName) return member.displayName[0].toUpperCase()
    return '?'
  }

  return (
    <ul className="flex flex-col gap-2">
      {members.map(member => (
        <li key={member.userId} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
            {initials(member)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{member.displayName ?? 'Sans nom'}</p>
            <p className="text-xs text-gray-400">{member.role === 'owner' ? 'Administrateur' : 'Membre'}</p>
          </div>
          {isOwner && member.userId !== currentUserId && (
            <button
              onClick={() => handleRemove(member.userId)}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              Retirer
            </button>
          )}
          {member.userId === currentUserId && (
            <span className="text-xs text-gray-300">Moi</span>
          )}
        </li>
      ))}
    </ul>
  )
}
