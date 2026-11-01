import Link from 'next/link'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import InviteButton from '@/components/InviteButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)

  return (
    <div className="min-h-screen flex flex-col max-w-lg md:max-w-5xl mx-auto">
      <header className="flex items-center justify-between px-4 py-4 border-b border-zinc-700 bg-zinc-900 gap-4">
        <Link href="/" className="font-semibold text-lg hover:opacity-70 transition-opacity">🏠 Home</Link>
        <div className="flex items-center gap-3">
          {membership && <InviteButton householdId={membership.householdId} />}
          <Link href="/household" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Mon foyer</Link>
          <Link href="/profile" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Mon profil</Link>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
