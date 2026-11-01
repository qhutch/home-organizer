'use client'

import { useActionState } from 'react'
import { updateProfile } from './actions'

export default function ProfileForm({ email, displayName }: { email: string; displayName: string }) {
  const [state, action, pending] = useActionState(
    async (_: { error?: string; success?: boolean } | null, formData: FormData) =>
      await updateProfile(formData) ?? null,
    null
  )

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-zinc-300 mb-1 block">Email</label>
        <p className="text-sm text-zinc-400 px-4 py-3 bg-zinc-900 rounded-xl">{email}</p>
      </div>

      <div>
        <label className="text-xs text-zinc-300 mb-1 block">Prénom</label>
        <input
          name="display_name"
          defaultValue={displayName}
          placeholder="Comment tu t'appelles ?"
          className="w-full border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-zinc-900"
        />
      </div>

      {state?.error && <p className="text-red-400 text-xs">{state.error}</p>}
      {state?.success && <p className="text-green-400 text-xs">Profil mis à jour !</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
      >
        {pending ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  )
}
