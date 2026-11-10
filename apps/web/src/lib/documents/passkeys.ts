import { headers } from 'next/headers'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { db } from '@/lib/firebase/admin'

// Clés d'accès (passkeys) : Face ID / Touch ID d'un appareil, enregistrées par membre.
// userPasskeys/{uid}/credentials/{id} — clé publique seulement, le visage ou l'empreinte ne quittent jamais l'appareil.
// passkeyChallenges/{uid} — le défi en cours (5 minutes), à usage unique.

export type StoredPasskey = {
  id: string
  publicKey: Uint8Array<ArrayBuffer>
  counter: number
  transports: AuthenticatorTransportFuture[]
}

const CHALLENGE_MS = 5 * 60 * 1000

// Le site tel que le voit le navigateur : la clé est liée à ce nom (home.qhutch.com, localhost…)
export async function relyingParty() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
  const proto = h.get('x-forwarded-proto') ?? (local ? 'http' : 'https')
  return { rpName: 'Hestia', rpID: host.split(':')[0], origin: `${proto}://${host}` }
}

function credentials(uid: string) {
  return db.collection('userPasskeys').doc(uid).collection('credentials')
}

export async function passkeysOf(uid: string): Promise<StoredPasskey[]> {
  const snap = await credentials(uid).get()
  return snap.docs.map(doc => {
    const d = doc.data()
    return {
      id: doc.id,
      publicKey: new Uint8Array(d.publicKey as Buffer),
      counter: (d.counter as number) ?? 0,
      transports: (d.transports as AuthenticatorTransportFuture[]) ?? [],
    }
  })
}

export async function savePasskey(uid: string, passkey: StoredPasskey & { deviceType: string; backedUp: boolean }) {
  await credentials(uid).doc(passkey.id).set({
    publicKey: Buffer.from(passkey.publicKey),
    counter: passkey.counter,
    transports: passkey.transports,
    deviceType: passkey.deviceType,
    backedUp: passkey.backedUp,
    createdAt: new Date(),
  })
}

export async function updatePasskeyCounter(uid: string, id: string, counter: number) {
  await credentials(uid).doc(id).update({ counter, lastUsedAt: new Date() })
}

export async function saveChallenge(uid: string, kind: 'register' | 'unlock', challenge: string) {
  await db.collection('passkeyChallenges').doc(uid).set({ kind, challenge, expiresAt: new Date(Date.now() + CHALLENGE_MS) })
}

// Rend le défi en cours et l'efface (il ne sert qu'une fois)
export async function takeChallenge(uid: string, kind: 'register' | 'unlock') {
  const ref = db.collection('passkeyChallenges').doc(uid)
  const data = (await ref.get()).data()
  await ref.delete()
  if (!data || data.kind !== kind || data.expiresAt.toDate().getTime() < Date.now()) return null
  return data.challenge as string
}
