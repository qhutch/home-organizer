'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { auth } from '@/lib/firebase/client'
import {
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import { finishFaceIdLogin, startFaceIdLogin } from './actions'
import { finishPasskeySetup, startPasskeySetup } from '@/app/(app)/documents/actions'
import Icon from '@/components/ui/Icon'

// Sur cet appareil : 'oui' = Face ID activé pour la connexion, 'non' = refusé (on ne le repropose plus)
const FACE_ID_KEY = 'hestia-face-id'
const OPTIONS_MS = 4 * 60 * 1000

function readFaceIdChoice() {
  try { return localStorage.getItem(FACE_ID_KEY) } catch { return null }
}
function saveFaceIdChoice(value: 'oui' | 'non' | null) {
  try {
    if (value) localStorage.setItem(FACE_ID_KEY, value)
    else localStorage.removeItem(FACE_ID_KEY)
  } catch {}
}

// L'appareil refuse ou l'utilisateur a annulé : pas de message, il peut réessayer
function cancelled(err: unknown) {
  return err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError')
}

async function openSession(user: User) {
  const token = await user.getIdToken()
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
}

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

  // Face ID : disponible sur l'appareil ? déjà activé ici ? Safari ne lance Face ID que juste
  // après un toucher : le défi est préparé à l'avance.
  const [faceIdAvailable, setFaceIdAvailable] = useState(false)
  const [faceIdChoice, setFaceIdChoice] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [offerFaceId, setOfferFaceId] = useState(false)
  const loginOptions = useRef<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON; at: number } | null>(null)
  const registerOptions = useRef<PublicKeyCredentialCreationOptionsJSON | null>(null)

  const prepareFaceId = useCallback(async () => {
    try {
      const res = await startFaceIdLogin()
      loginOptions.current = { ...res, at: Date.now() }
    } catch {
      loginOptions.current = null
    }
    return loginOptions.current
  }, [])

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return
    void platformAuthenticatorIsAvailable().then(available => {
      setFaceIdChoice(readFaceIdChoice())
      setFaceIdAvailable(available)
      if (available) void prepareFaceId()
    })
  }, [prepareFaceId])

  async function loginWithFaceId() {
    setError(null)
    setLoading(true)
    try {
      const ready = loginOptions.current && Date.now() - loginOptions.current.at < OPTIONS_MS
      const prepared = ready ? loginOptions.current! : await prepareFaceId()
      loginOptions.current = null
      if (!prepared) throw new Error('Face ID n’a pas marché')
      const response = await startAuthentication({ optionsJSON: prepared.options })
      const res = await finishFaceIdLogin(prepared.challengeId, response)
      if (!res.ok) throw new Error(res.error)
      const credential = await signInWithCustomToken(auth, res.token)
      await openSession(credential.user)
      saveFaceIdChoice('oui')
      router.push(redirectTo)
    } catch (err) {
      if (!cancelled(err)) {
        setError(err instanceof Error ? err.message : 'Face ID n’a pas marché')
        setShowPassword(true)
      }
      void prepareFaceId()
      setLoading(false)
    }
  }

  async function activateFaceId() {
    setError(null)
    setLoading(true)
    try {
      if (!registerOptions.current) throw new Error('C’était trop long')
      const response = await startRegistration({ optionsJSON: registerOptions.current })
      registerOptions.current = null
      const res = await finishPasskeySetup(response)
      if (!res.ok) throw new Error(res.error)
      saveFaceIdChoice('oui')
      router.push(redirectTo)
    } catch (err) {
      // Déjà activé sur cet iPhone (par exemple depuis les Documents)
      if (err instanceof Error && err.name === 'InvalidStateError') {
        saveFaceIdChoice('oui')
        router.push(redirectTo)
        return
      }
      if (!cancelled(err)) setError(err instanceof Error ? err.message : 'Face ID n’a pas marché')
      setLoading(false)
    }
  }

  function skipFaceId() {
    saveFaceIdChoice('non')
    router.push(redirectTo)
  }

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
      }

      await openSession(userCredential.user)

      // Prénom enregistré une fois la session ouverte (la route lit le cookie)
      if (mode === 'signup') {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: displayName.trim() }),
          credentials: 'include',
        })
      }

      // Proposer Face ID pour la prochaine fois (le mot de passe vient d'être tapé)
      if (mode === 'login' && faceIdAvailable && !readFaceIdChoice()) {
        const setup = await startPasskeySetup(await userCredential.user.getIdToken(true)).catch(() => null)
        if (setup?.ok) {
          registerOptions.current = setup.options
          setOfferFaceId(true)
          setLoading(false)
          return
        }
      }

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

        {offerFaceId ? (
          <div className="flex flex-col gap-3 mt-6">
            <button type="button" onClick={activateFaceId} disabled={loading} className="btn">
              <Icon name="faceId" />
              Activer Face ID pour la prochaine fois
            </button>
            <button type="button" onClick={skipFaceId} disabled={loading} className="btn-outline">
              Plus tard
            </button>
            {error && <p role="alert" className="text-pink-deep text-xs">{error}</p>}
          </div>
        ) : mode === 'login' && faceIdAvailable && faceIdChoice === 'oui' && !showPassword ? (
          <div className="flex flex-col gap-3 mt-6">
            <button type="button" onClick={loginWithFaceId} disabled={loading} className="btn btn-lg">
              <Icon name="faceId" />
              {loading ? 'Chargement...' : 'Se connecter avec Face ID'}
            </button>
            <button type="button" onClick={() => { setError(null); setShowPassword(true) }} className="btn-outline">
              Utiliser mon mot de passe
            </button>
          </div>
        ) : (
        <>
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
            autoComplete={mode === 'login' ? 'username' : 'email'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="field"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
          {mode === 'login' && faceIdAvailable && (
            <button type="button" onClick={loginWithFaceId} disabled={loading} className="btn-outline">
              <Icon name="faceId" />
              Se connecter avec Face ID
            </button>
          )}
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          className="w-full text-center text-sm text-ink-muted mt-4 hover:text-ink"
        >
          {mode === 'login' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
        </>
        )}
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
