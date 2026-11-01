'use client'

import { auth } from '@/lib/firebase/client'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await signOut(auth)
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
      Déconnexion
    </button>
  )
}
