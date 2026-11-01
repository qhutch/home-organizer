import { db } from '@/lib/firebase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const stateRaw = request.nextUrl.searchParams.get('state')

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL('/calendar?error=missing_params', request.url))
  }

  const { householdId } = JSON.parse(stateRaw)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL('/calendar?error=token_exchange', request.url))
  }

  await db
    .collection('households')
    .doc(householdId)
    .collection('calendarConnections')
    .doc('main')
    .set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      calendarId: null,
      calendarName: null,
    })

  return NextResponse.redirect(new URL('/calendar/pick', request.url))
}
