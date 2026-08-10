import { NextResponse } from 'next/server';

// Middleware runs on the Edge runtime, where Mongoose cannot run. All it does is
// check that a session cookie exists. Verifying the token and checking the role
// happens inside each route handler, which is where it is actually enforced.
const SESSION_COOKIE = 'hub_session';

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  if (pathname === '/login') {
    if (signedIn) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (!signedIn) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
