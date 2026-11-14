'use server'

import { randomBytes } from 'node:crypto'
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server'
import { adminAuth } from '@/lib/firebase/admin'
import { passkeysOf, relyingParty, saveChallenge, takeChallenge, updatePasskeyCounter } from '@/lib/documents/passkeys'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

// Connexion par Face ID : mêmes clés que pour les Documents (userPasskeys).
// L'iPhone propose la clé Hestia qu'il a ; elle porte l'uid du membre (userHandle, posé à l'activation).
export async function startFaceIdLogin(): Promise<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }> {
  const { rpID } = await relyingParty()
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' })
  const challengeId = `login-${randomBytes(16).toString('hex')}`
  await saveChallenge(challengeId, 'login', options.challenge)
  return { challengeId, options }
}

// Rend un jeton Firebase à usage unique (signInWithCustomToken côté navigateur)
export async function finishFaceIdLogin(challengeId: string, response: AuthenticationResponseJSON): Promise<Result<{ token: string }>> {
  if (!challengeId.startsWith('login-')) return { ok: false, error: 'C’était trop long, recommence' }
  const challenge = await takeChallenge(challengeId, 'login')
  if (!challenge) return { ok: false, error: 'C’était trop long, recommence' }
  const uid = response.response.userHandle ? Buffer.from(response.response.userHandle, 'base64url').toString('utf8') : ''
  if (!/^[A-Za-z0-9]{1,128}$/.test(uid)) return { ok: false, error: 'Face ID n’est pas activé pour Hestia sur cet appareil' }
  const passkey = (await passkeysOf(uid)).find(p => p.id === response.id)
  if (!passkey) return { ok: false, error: 'Face ID n’est pas activé pour Hestia sur cet appareil' }
  const { rpID, origin } = await relyingParty()
  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: passkey.id, publicKey: passkey.publicKey, counter: passkey.counter, transports: passkey.transports },
      requireUserVerification: true,
    })
    if (!verified) return { ok: false, error: 'Face ID n’a pas été reconnu' }
    await updatePasskeyCounter(uid, passkey.id, authenticationInfo.newCounter)
  } catch {
    return { ok: false, error: 'Face ID n’a pas été reconnu' }
  }
  return { ok: true, token: await adminAuth.createCustomToken(uid) }
}
