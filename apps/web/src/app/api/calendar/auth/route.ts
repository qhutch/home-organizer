import { getSessionUser } from '@/lib/firebase/session'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'].join(' ')

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return redirect('/login')

  const householdId = request.nextUrl.searchParams.get('householdId')
  if (!householdId) return new Response('Missing householdId', { status: 400 })

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: JSON.stringify({ householdId, userId: user.uid }),
  })

  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
