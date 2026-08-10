import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db.js';
import User from '../models/User.js';
import { forbidden, unauthorised } from './http.js';

export const SESSION_COOKIE = 'hub_session';
const SESSION_DAYS = 7;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env.local.',
    );
  }
  return new TextEncoder().encode(value);
}

export async function signToken(user) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user._id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

/** Returns the signed-in user as a plain object, or null. Never throws for a bad token. */
export async function readSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let claims;
  try {
    const { payload } = await jwtVerify(token, secret());
    claims = payload;
  } catch {
    return null;
  }

  await db();
  const user = await User.findById(claims.sub).lean();
  if (!user || user.active === false) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}

export async function requireUser() {
  const user = await readSession();
  if (!user) throw unauthorised();
  return user;
}

export async function requireRole(...roles) {
  const user = await requireUser();
  const allowed = roles.flat();
  if (!allowed.includes(user.role)) {
    throw forbidden(
      `Your role (${user.role}) cannot do this. Ask an administrator if you need access.`,
    );
  }
  return user;
}
