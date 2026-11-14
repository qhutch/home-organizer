'use client'

import { useState, useTransition } from 'react'
import Avatar from '@/components/ui/Avatar'
import { setFamilyGroup, setMemberNasAccount } from './actions'

type Member = { userId: string; displayName: string | null; avatarUrl: string | null }
type Account = { type: 'user' | 'group'; id: number; name: string }

// Réglages › NAS : à qui Hestia partage les albums qu'elle crée.
// Le compte Synology de chaque membre, et le groupe proposé sous le nom « Famille ».
export default function NasSharing({ members, accounts, memberAccounts, familyGroupId }: {
  members: Member[]
  accounts: Account[]
  memberAccounts: Record<string, number | null>
  familyGroupId: number | null
}) {
  const [chosen, setChosen] = useState(memberAccounts)
  const [family, setFamily] = useState(familyGroupId)
  const [, startTransition] = useTransition()
  const users = accounts.filter(a => a.type === 'user')
  const groups = accounts.filter(a => a.type === 'group')

  return (
    <div className="card flex flex-col gap-3">
      {members.map(member => (
        <label key={member.userId} className="flex items-center gap-3 text-sm font-medium">
          <Avatar url={member.avatarUrl} name={member.displayName} size={32} />
          <span className="flex-1 min-w-0 truncate">{member.displayName ?? 'Membre'}</span>
          <select
            className="field w-36"
            value={chosen[member.userId] ?? ''}
            onChange={e => {
              const id = e.target.value ? Number(e.target.value) : null
              setChosen(c => ({ ...c, [member.userId]: id }))
              startTransition(() => setMemberNasAccount(member.userId, id))
            }}
          >
            <option value="">Aucun</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
      ))}
      <label className="flex items-center gap-3 text-sm font-medium mt-2">
        <span className="flex-1">Famille</span>
        <select
          className="field w-36"
          value={family ?? ''}
          onChange={e => {
            const id = e.target.value ? Number(e.target.value) : null
            setFamily(id)
            startTransition(() => setFamilyGroup(id))
          }}
        >
          <option value="">Aucun</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </label>
    </div>
  )
}
