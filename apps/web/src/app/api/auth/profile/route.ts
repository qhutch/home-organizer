import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, db } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('__session')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const { displayName } = await request.json()

    await db.collection('userProfiles').doc(decoded.uid).set({
      displayName: displayName ?? null,
      avatarUrl: null,
      updatedAt: new Date().toISOString(),
    }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
