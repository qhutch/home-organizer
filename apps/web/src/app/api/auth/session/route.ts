import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = '__session'
const ONE_HOUR = 60 * 60

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_HOUR,
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
