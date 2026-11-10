'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { browserSupportsWebAuthn, startAuthentication, startRegistration, type PublicKeyCredentialCreationOptionsJSON, type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import { auth } from '@/lib/firebase/client'
import { finishPasskeySetup, finishUnlock, startPasskeySetup, startUnlock } from '@/app/(app)/documents/actions'
import { FEATURES } from '@/lib/ui/features'
import Icon from '@/components/ui/Icon'

const OPTIONS_MS = 4 * 60 * 1000

// L'appareil refuse ou l'utilisateur a annulé : pas de message, il peut réessayer
function cancelled(err: unknown) {
  return err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError')
}

// Écran verrouillé de l'onglet Documents : Face ID pour l'ouvrir.
// Première fois sur un appareil : le mot de passe Hestia, puis Face ID.
// Safari n'accepte Face ID que juste après un toucher : le défi est préparé à l'avance,
// et l'activation se fait en deux touchers (mot de passe, puis Face ID).
export default function DocumentsLock({ email, hasPasskey }: { email: string; hasPasskey: boolean }) {
  const router = useRouter()
  const fill = FEATURES.documents.fill
  const [mode, setMode] = useState<'unlock' | 'password' | 'register'>(hasPasskey ? 'unlock' : 'password')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unlockOptions = useRef<{ options: PublicKeyCredentialRequestOptionsJSON; at: number } | null>(null)
  const registerOptions = useRef<PublicKeyCredentialCreationOptionsJSON | null>(null)

  const prepareUnlock = useCallback(async () => {
    const res = await startUnlock()
    unlockOptions.current = res.ok ? { options: res.options, at: Date.now() } : null
    return unlockOptions.current?.options ?? null
  }, [])

  useEffect(() => {
    if (hasPasskey) void prepareUnlock()
  }, [hasPasskey, prepareUnlock])

  // Vrai si l'appareil sait faire Face ID / Touch ID ; sinon le dit
  function canUsePasskeys() {
    if (browserSupportsWebAuthn()) return true
    setError('Face ID n’est pas disponible sur cet appareil')
    return false
  }

  async function unlock() {
    setError(null)
    if (!canUsePasskeys()) return
    setBusy(true)
    try {
      const ready = unlockOptions.current && Date.now() - unlockOptions.current.at < OPTIONS_MS
      const options = ready ? unlockOptions.current!.options : await prepareUnlock()
      unlockOptions.current = null
      if (!options) throw new Error('Face ID n’est pas encore activé')
      const response = await startAuthentication({ optionsJSON: options })
      const res = await finishUnlock(response)
      if (!res.ok) throw new Error(res.error)
      router.refresh()
    } catch (err) {
      if (!cancelled(err)) setError(err instanceof Error ? err.message : 'Face ID n’a pas marché')
      void prepareUnlock()
      setBusy(false)
    }
  }

  async function checkPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canUsePasskeys()) return
    setBusy(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const res = await startPasskeySetup(await credential.user.getIdToken(true))
      if (!res.ok) throw new Error(res.error)
      registerOptions.current = res.options
      setPassword('')
      setMode('register')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('auth/') ? 'Mot de passe incorrect' : msg || 'Ça n’a pas marché')
    }
    setBusy(false)
  }

  async function register() {
    if (!registerOptions.current) return setMode('password')
    setError(null)
    setBusy(true)
    try {
      const response = await startRegistration({ optionsJSON: registerOptions.current })
      registerOptions.current = null
      const res = await finishPasskeySetup(response)
      if (!res.ok) throw new Error(res.error)
      router.refresh()
    } catch (err) {
      registerOptions.current = null
      setMode('password')
      if (err instanceof Error && err.name === 'InvalidStateError') setError('Face ID est déjà activé sur cet appareil')
      else if (!cancelled(err)) setError(err instanceof Error ? err.message : 'Face ID n’a pas marché')
      setBusy(false)
    }
  }

  return (
    <div className="card flex flex-col items-center gap-5 py-10 text-center">
      <span className={`size-20 rounded-full flex items-center justify-center ${FEATURES.documents.soft}`}>
        <Icon name="lock" size={40} className={FEATURES.documents.text} />
      </span>
      <h2 className="font-display font-semibold text-lg">
        {mode === 'unlock' ? 'Documents verrouillés' : 'Activer Face ID'}
      </h2>

      {mode === 'unlock' ? (
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={unlock} disabled={busy} className={`btn-feature ${fill}`}>
            <Icon name="faceId" />
            Déverrouiller avec Face ID
          </button>
          <button type="button" onClick={() => { setError(null); setMode('password') }} className="btn-outline">
            Activer Face ID sur cet appareil
          </button>
        </div>
      ) : mode === 'password' ? (
        <form onSubmit={checkPassword} className="flex flex-col gap-2 w-full max-w-xs">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe Hestia"
            autoComplete="current-password"
            required
            autoFocus
            className="field"
          />
          <button type="submit" disabled={busy || !password} className={`btn-feature ${fill}`}>Continuer</button>
          {hasPasskey && (
            <button type="button" onClick={() => { setError(null); setMode('unlock') }} className="btn-outline">Annuler</button>
          )}
        </form>
      ) : (
        <button type="button" onClick={register} disabled={busy} className={`btn-feature ${fill}`}>
          <Icon name="faceId" />
          Activer Face ID
        </button>
      )}

      {error && <p role="alert" className="text-sm text-pink-deep">{error}</p>}
    </div>
  )
}
