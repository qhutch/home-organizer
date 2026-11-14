import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

const SESSION_COOKIE = '__session'
// On reste connecté 2 semaines (le maximum de Firebase)
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  // L'ID token (1 heure) est échangé contre un cookie de session Firebase ;
  // Firebase n'accepte qu'une connexion de moins de 5 minutes
  let session
  try {
    session = await adminAuth.createSessionCookie(token, { expiresIn: TWO_WEEKS_MS })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TWO_WEEKS_MS / 1000,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  // Les documents se reverrouillent aussi (lib/documents/unlock.ts)
  res.cookies.delete('__documents')
  return res
}
