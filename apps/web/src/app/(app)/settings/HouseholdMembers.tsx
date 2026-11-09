'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import { shrinkPhoto } from '@/lib/recipes/photo'
import { removeAvatar, removeMember, setAvatar, updateProfile } from './actions'

type Member = {
  userId: string
  role: 'owner' | 'member'
  displayName: string | null
  avatarUrl: string | null
}

function roleLabel(member: Member) {
  return member.role === 'owner' ? 'Administrateur' : 'Membre'
}

// Ma photo : on touche le rond pour en choisir une (réduite à 400 px avant l'envoi).
function MyAvatar({ member }: { member: Member }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await setAvatar(await shrinkPhoto(file, 400))
        if (result.error) setError(result.error)
      } catch {
        setError('Impossible d’utiliser cette photo.')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label={member.avatarUrl ? 'Changer ma photo' : 'Ajouter ma photo'}
        className="relative rounded-full disabled:opacity-50"
      >
        <Avatar name={member.displayName} url={member.avatarUrl} size={48} />
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-ink text-surface flex items-center justify-center">
          <Icon name="camera" size={12} />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {member.avatarUrl && (
        <button type="button" disabled={pending} onClick={() => startTransition(() => removeAvatar())} className="text-[11px] text-ink-muted hover:text-pink-deep">
          Retirer
        </button>
      )}
      {error && <p className="text-pink-deep text-[11px]">{error}</p>}
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
            <MyAvatar member={member} />
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
      <MyAvatar member={member} />
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
          <Avatar name={member.displayName} url={member.avatarUrl} size={48} />
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
