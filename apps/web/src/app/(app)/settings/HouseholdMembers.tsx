'use client'

import { useActionState, useState, useTransition } from 'react'
import { removeMember, updateProfile } from './actions'

type Member = {
  userId: string
  role: 'owner' | 'member'
  displayName: string | null
}

function roleLabel(member: Member) {
  return member.role === 'owner' ? 'Administrateur' : 'Membre'
}

function Avatar({ name }: { name: string | null }) {
  return (
    <div className="w-9 h-9 rounded-full bg-coconut flex items-center justify-center text-sm font-semibold text-ink shrink-0">
      {name ? name[0].toUpperCase() : '?'}
    </div>
  )
}

// Ma propre ligne dans le foyer : c'est là que je règle mon prénom.
// Le champ n'apparaît que tant que le prénom est vide, ou après « Modifier ».
function MyMemberCard({ member, email }: { member: Member; email: string }) {
  const displayName = member.displayName ?? ''
  const [editing, setEditing] = useState(!displayName)
  const [state, action, pending] = useActionState(
    async (_: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = (await updateProfile(formData)) ?? null
      if (result?.success && formData.get('display_name')?.toString().trim()) setEditing(false)
      return result
    },
    null
  )

  if (editing) {
    return (
      <li className="card">
        <form action={action} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={displayName || null} />
            <div className="min-w-0">
              <p className="text-sm font-medium">Moi</p>
              <p className="text-xs text-ink-muted truncate">{email}</p>
            </div>
          </div>
          <div>
            <label htmlFor="display_name" className="eyebrow mb-1.5 block">Prénom</label>
            <input
              id="display_name"
              name="display_name"
              defaultValue={displayName}
              placeholder="Comment tu t'appelles ?"
              className="field"
              autoFocus={!!displayName}
            />
          </div>
          {state?.error && <p className="text-pink-deep text-xs">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="btn">
              {pending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {displayName && (
              <button type="button" onClick={() => setEditing(false)} className="btn-outline">
                Annuler
              </button>
            )}
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="card flex items-center gap-3">
      <Avatar name={displayName} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{displayName} <span className="text-ink-muted font-normal">· moi</span></p>
        <p className="text-xs text-ink-muted truncate">{roleLabel(member)} · {email}</p>
      </div>
      <button type="button" onClick={() => setEditing(true)} className="btn-outline shrink-0">
        Modifier
      </button>
    </li>
  )
}

export default function HouseholdMembers({ members, householdId, currentUserId, currentUserEmail, isOwner }: {
  members: Member[]
  householdId: string
  currentUserId: string
  currentUserEmail: string
  isOwner: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove(userId: string) {
    if (!confirm('Retirer ce membre du foyer ?')) return
    startTransition(async () => {
      await removeMember(userId, householdId)
    })
  }

  const me = members.find(m => m.userId === currentUserId)
  const others = members.filter(m => m.userId !== currentUserId)

  return (
    <ul className="flex flex-col gap-2">
      {me && <MyMemberCard member={me} email={currentUserEmail} />}
      {others.map(member => (
        <li key={member.userId} className="card flex items-center gap-3">
          <Avatar name={member.displayName} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{member.displayName ?? 'Sans nom'}</p>
            <p className="text-xs text-ink-muted">{roleLabel(member)}</p>
          </div>
          {isOwner && (
            <button
              onClick={() => handleRemove(member.userId)}
              disabled={isPending}
              className="text-xs text-pink-deep hover:text-ink disabled:opacity-50 transition-colors"
            >
              Retirer
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
