import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'

export default async function RecipesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-bold mb-8">Recettes</h2>
      <div className="bg-zinc-700 rounded-2xl px-5 py-12 shadow-sm flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">🍳</span>
        <p className="font-semibold">À venir</p>
        <p className="text-xs text-zinc-400">Les recettes du foyer arriveront bientôt ici.</p>
      </div>
    </div>
  )
}
