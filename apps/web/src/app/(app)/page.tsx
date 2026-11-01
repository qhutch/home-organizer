import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const [householdDoc, profileDoc, shoppingSnap] = await Promise.all([
    db.collection('households').doc(membership.householdId).get(),
    db.collection('userProfiles').doc(user.uid).get(),
    db.collection('households').doc(membership.householdId)
      .collection('shoppingItems').where('inList', '==', true).get(),
  ])

  const household = householdDoc.data()
  const profile = profileDoc.data()
  const shoppingCount = shoppingSnap.size
  const greeting = profile?.displayName ? `Bonjour, ${profile.displayName} 👋` : 'Bonjour 👋'

  return (
    <div className="px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">{greeting}</h1>
      <p className="text-zinc-400 text-sm mb-8">{household?.name}</p>

      <div className="flex flex-col gap-3">
        <Link href="/shopping" className="bg-zinc-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <span className="text-3xl">🛒</span>
          <div>
            <p className="font-semibold">Liste de courses</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {shoppingCount ? `${shoppingCount} article${shoppingCount > 1 ? 's' : ''} à acheter` : 'Liste vide'}
            </p>
          </div>
          <span className="ml-auto text-zinc-500">›</span>
        </Link>

        <Link href="/calendar" className="bg-zinc-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <span className="text-3xl">📅</span>
          <div>
            <p className="font-semibold">Calendrier</p>
            <p className="text-xs text-zinc-400 mt-0.5">Événements partagés</p>
          </div>
          <span className="ml-auto text-zinc-500">›</span>
        </Link>

        <Link href="/recipes" className="bg-zinc-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <span className="text-3xl">🍳</span>
          <div>
            <p className="font-semibold">Recettes</p>
            <p className="text-xs text-zinc-400 mt-0.5">À venir</p>
          </div>
          <span className="ml-auto text-zinc-500">›</span>
        </Link>

        <Link href="/works" className="bg-zinc-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <span className="text-3xl">🛠️</span>
          <div>
            <p className="font-semibold">Travaux</p>
            <p className="text-xs text-zinc-400 mt-0.5">À venir</p>
          </div>
          <span className="ml-auto text-zinc-500">›</span>
        </Link>
      </div>
    </div>
  )
}
