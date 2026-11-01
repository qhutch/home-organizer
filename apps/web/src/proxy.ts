import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = '__session'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isApi = request.nextUrl.pathname.startsWith('/api')

  if (isApi) return NextResponse.next()

  if (!token && !isAuthPage) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
