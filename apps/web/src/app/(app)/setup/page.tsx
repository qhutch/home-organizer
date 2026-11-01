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
        <h2 className="text-2xl font-bold mb-1">Bienvenue 👋</h2>
        <p className="text-zinc-300 text-sm mb-8">Crée ton foyer pour commencer.</p>

        <form action={action} className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="Nom du foyer (ex: Chez nous)"
            className="border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-zinc-900"
            required
          />
          {state?.error && <p className="text-red-400 text-xs">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            {pending ? '...' : 'Créer le foyer'}
          </button>
        </form>
      </div>
    </div>
  )
}
