import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { badRequest, notFound } from './http.js';

/**
 * Receipt attachments on the server's own disk. Files live outside `public/`
 * and are only ever served through an authenticated route — a receipt is a
 * financial record, not something a guessed URL should hand over.
 */

export const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Trusting the browser's Content-Type would let anything through under a
 * borrowed label, so the type is read from the file's own leading bytes.
 */
const SIGNATURES = [
  { ext: 'pdf', mimeType: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  { ext: 'png', mimeType: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', mimeType: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  { ext: 'gif', mimeType: 'image/gif', magic: [0x47, 0x49, 0x46, 0x38] },
];

const isWebp = (buffer) =>
  buffer.length > 12 &&
  buffer.toString('ascii', 0, 4) === 'RIFF' &&
  buffer.toString('ascii', 8, 12) === 'WEBP';

export const ACCEPTED = 'PDF, JPEG, PNG, WebP or GIF';

export function sniff(buffer) {
  for (const candidate of SIGNATURES) {
    if (candidate.magic.every((byte, index) => buffer[index] === byte)) {
      return { ext: candidate.ext, mimeType: candidate.mimeType };
    }
  }
  if (isWebp(buffer)) return { ext: 'webp', mimeType: 'image/webp' };
  return null;
}

/** Absolute path of the upload folder. Override with UPLOAD_DIR. */
export function uploadDir() {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), 'uploads');
}

/**
 * Joins a directory and a filename without calling path.join.
 *
 * Turbopack's build tracer pattern-matches path.join()/path.resolve() at a
 * filesystem call site and, when it cannot fold the arguments down to a
 * literal, traces the whole project into the server output. This folder is
 * configurable by design, so the path is assembled directly instead. The
 * result is identical, and `resolveStored` still checks the name can't escape.
 */
const inDir = (dir, name) => `${dir}${dir.endsWith(path.sep) ? '' : path.sep}${name}`;

// A generated name, so nothing the user typed reaches the filesystem and two
// receipts called "photo.jpg" cannot collide.
const STORED_NAME = /^[0-9a-f-]{36}\.[a-z]{3,4}$/;

export function isStoredName(name) {
  return typeof name === 'string' && STORED_NAME.test(name);
}

/** Resolves a stored name to a path, refusing anything that escapes the folder. */
export function resolveStored(name) {
  if (!isStoredName(name)) throw notFound('That attachment could not be found.');
  const dir = uploadDir();
  const full = inDir(dir, name);
  if (path.dirname(full) !== dir) throw notFound('That attachment could not be found.');
  return full;
}

/** Writes the file and returns the descriptor to store on the transaction. */
export async function saveUpload(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw badRequest('Choose a file to attach.');
  }
  if (file.size === 0) throw badRequest('That file is empty.');
  if (file.size > MAX_BYTES) {
    throw badRequest('That file is larger than 5MB. Photograph the receipt at a smaller size.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buffer);
  if (!kind) {
    throw badRequest(`That file is not a ${ACCEPTED}. Attach a photo of the receipt or a PDF.`);
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${kind.ext}`;
  await writeFile(inDir(dir, filename), buffer, { flag: 'wx' });

  return {
    filename,
    originalName: String(file.name ?? 'receipt').slice(0, 200),
    mimeType: kind.mimeType,
    size: buffer.length,
    uploadedAt: new Date(),
  };
}

/** Confirms a descriptor from the client points at a file we actually wrote. */
export async function verifyStored(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') return null;
  const { filename } = descriptor;
  if (!isStoredName(filename)) {
    throw badRequest('That attachment is no longer available. Attach it again.');
  }

  let info;
  try {
    info = await stat(resolveStored(filename));
  } catch {
    throw badRequest('That attachment is no longer available. Attach it again.');
  }

  return {
    filename,
    originalName: String(descriptor.originalName ?? 'receipt').slice(0, 200),
    mimeType: String(descriptor.mimeType ?? 'application/octet-stream').slice(0, 100),
    size: info.size,
    uploadedAt: descriptor.uploadedAt ? new Date(descriptor.uploadedAt) : new Date(),
  };
}
