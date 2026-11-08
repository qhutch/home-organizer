'use client'

import { useState, Suspense } from 'react'
import { auth } from '@/lib/firebase/client'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const isInvite = redirectTo.includes('/setup/invite/')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>(isInvite ? 'signup' : 'login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let userCredential

      if (mode === 'login') {
        userCredential = await signInWithEmailAndPassword(auth, email, password)
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(userCredential.user, { displayName: displayName.trim() })
        // Save display name to Firestore via API
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: displayName.trim() }),
          credentials: 'include',
        })
      }

      const token = await userCredential.user.getIdToken()
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      router.push(redirectTo)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('Email ou mot de passe incorrect')
      } else if (msg.includes('email-already-in-use')) {
        setError('Cet email est déjà utilisé')
      } else if (msg.includes('weak-password')) {
        setError('Mot de passe trop faible (6 caractères minimum)')
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="card max-w-sm w-full !p-8">
        <h1 className="text-4xl mb-1">Hestia</h1>
        <p className="text-ink text-sm mb-6">
          {mode === 'login' ? 'Connecte-toi pour continuer' : isInvite ? 'Crée ton compte pour rejoindre le foyer' : 'Crée ton compte'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Ton prénom"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className="field"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="field"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="field"
          />

          {error && <p className="text-pink-deep text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn mt-1"
          >
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          className="w-full text-center text-sm text-ink-muted mt-4 hover:text-ink"
        >
          {mode === 'login' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
