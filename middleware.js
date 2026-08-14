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
  // Static files are skipped by extension rather than by name: the sign-in page
  // has to be able to load the logo while nobody is signed in, and an asset
  // that redirects to /login is an invisible one. No app route contains a dot,
  // so matching on the extension is safe.
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|txt|xml|webmanifest)$).*)',
  ],
};
