import { getSessionUser } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/ui/AppHeader'
import { CookTimersProvider } from '@/components/recipes/CookTimers'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col max-w-lg md:max-w-5xl mx-auto">
      <AppHeader />
      <main className="flex-1 pb-24">
        {/* Minuteurs du mode cuisine : ils continuent de tourner quand on va sur une autre page */}
        <CookTimersProvider>{children}</CookTimersProvider>
      </main>
    </div>
  )
}
