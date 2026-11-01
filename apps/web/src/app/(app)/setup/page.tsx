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
        <p className="text-gray-500 text-sm mb-8">Crée ton foyer pour commencer.</p>

        <form action={action} className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="Nom du foyer (ex: Chez nous)"
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            required
          />
          {state?.error && <p className="text-red-500 text-xs">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="bg-black text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {pending ? '...' : 'Créer le foyer'}
          </button>
        </form>
      </div>
    </div>
  )
}
