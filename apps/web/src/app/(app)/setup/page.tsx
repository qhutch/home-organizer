'use client'

import { useActionState } from 'react'
import { createHousehold } from './actions'

export default function SetupPage() {
  const [state, action, pending] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      return await createHousehold(formData) ?? null
    },
    null
  )

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl mb-1">Bienvenue 👋</h1>
        <p className="text-ink text-sm mb-8">Crée ton foyer pour commencer.</p>

        <form action={action} className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="Nom du foyer (ex: Chez nous)"
            className="field"
            required
          />
          {state?.error && <p className="text-pink-deep text-xs">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="btn"
          >
            {pending ? '...' : 'Créer le foyer'}
          </button>
        </form>
      </div>
    </div>
  )
}
