import { NextResponse } from 'next/server';
import { db } from './db.js';

/** An error carrying the status and the message the user should see. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorised = (message = 'You are signed out. Sign in again to continue.') =>
  new HttpError(401, message);
export const forbidden = (message) => new HttpError(403, message);
export const notFound = (message = 'That record no longer exists.') =>
  new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);

export function ok(data, status = 200) {
  return NextResponse.json(data ?? {}, { status });
}

export function fail(error, status = 400, details) {
  const body = { error };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Wraps a route handler: opens the cached connection, turns thrown HttpErrors and
 * Mongoose validation errors into the documented error shape.
 */
export function handler(fn) {
  return async function wrapped(request, context) {
    try {
      await db();
      return await fn(request, context);
    } catch (err) {
      if (err instanceof HttpError) {
        return fail(err.message, err.status, err.details);
      }
      if (err?.name === 'ValidationError') {
        const details = {};
        for (const [field, issue] of Object.entries(err.errors ?? {})) {
          details[field] = issue.message;
        }
        return fail('Some fields need attention before this can be saved.', 400, details);
      }
      if (err?.name === 'CastError') {
        return fail('That record could not be found.', 404);
      }
      // Mongoose wraps the driver's errors, so both spellings turn up; a dead
      // network shows up earlier still, as a DNS failure on the SRV lookup.
      const unreachable =
        /^Mongo(ose)?\w*(ServerSelection|Network|Timeout)\w*Error$/.test(err?.name ?? '') ||
        ['ECONNREFUSED', 'ETIMEOUT', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(err?.code) ||
        err?.syscall === 'querySrv';

      if (unreachable) {
        console.error('[api] database unreachable', err.message);
        return fail(
          'The database is not reachable right now. Check your connection and try again in a moment.',
          503,
        );
      }
      if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value';
        return fail(`That ${field} is already in use. Choose another one.`, 409);
      }
      console.error('[api]', err);
      return fail('Something went wrong on our side. Try again in a moment.', 500);
    }
  };
}

/** Reads and validates a JSON body. */
export async function readBody(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') throw new Error('not an object');
    return body;
  } catch {
    throw badRequest('The request body was not valid JSON.');
  }
}

export function searchParams(request) {
  return new URL(request.url).searchParams;
}
