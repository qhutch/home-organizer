'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'
import PhotoCropper from '@/components/recipes/PhotoCropper'
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

// Ma photo : on touche le rond pour ouvrir sa fiche (choisir une photo, la recadrer, la retirer).
// La photo choisie passe par le recadrage (carré, dans un rond) et part en 400 px.
function MyAvatar({ member }: { member: Member }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  // Photo en cours de recadrage : une photo choisie (adresse locale) ou la photo actuelle
  const [cropping, setCropping] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function close() {
    if (cropping?.startsWith('blob:')) URL.revokeObjectURL(cropping)
    setCropping(null)
    setError(null)
    setOpen(false)
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      setCropping(URL.createObjectURL(await shrinkPhoto(file)))
    } catch {
      setError('Impossible d’utiliser cette photo.')
    }
  }

  function save(photo: Blob) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await setAvatar(photo)
        if (result.error) setError(result.error)
        else close()
      } catch {
        setError('Impossible d’utiliser cette photo.')
      }
    })
  }

  function remove() {
    startTransition(async () => {
      await removeAvatar()
      close()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={member.avatarUrl ? 'Modifier ma photo' : 'Ajouter ma photo'}
        className="relative rounded-full shrink-0"
      >
        <Avatar name={member.displayName} url={member.avatarUrl} size={48} />
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-ink text-surface flex items-center justify-center">
          <Icon name="camera" size={12} />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {open && (
        <Sheet title="Ma photo" onClose={close}>
          {cropping ? (
            <PhotoCropper
              src={cropping}
              ratio={1}
              round
              maxSide={400}
              doneClass="btn"
              pending={pending}
              onDone={save}
              onCancel={() => {
                if (cropping.startsWith('blob:')) URL.revokeObjectURL(cropping)
                setCropping(null)
              }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex justify-center py-2">
                <Avatar name={member.displayName} url={member.avatarUrl} size={160} />
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className="btn">
                <Icon name="camera" size={20} /> {member.avatarUrl ? 'Choisir une autre photo' : 'Choisir une photo'}
              </button>
              {member.avatarUrl && (
                <>
                  <button type="button" onClick={() => setCropping(member.avatarUrl)} disabled={pending} className="btn-outline">
                    <Icon name="pencil" size={20} /> Recadrer
                  </button>
                  <button type="button" onClick={remove} disabled={pending} className="btn-danger">
                    <Icon name="trash" size={20} /> Retirer ma photo
                  </button>
                </>
              )}
            </div>
          )}
          {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
        </Sheet>
      )}
    </>
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
