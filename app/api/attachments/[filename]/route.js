import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import Transaction from '@/models/Transaction';
import { handler, notFound } from '@/lib/http';
import { requireUser } from '@/lib/session';
import { resolveStored } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rendered in the browser rather than downloaded. Everything else is sent as an
// attachment so a file that somehow got past the type check cannot execute in
// the origin.
const INLINE = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const GET = handler(async (_request, { params }) => {
  await requireUser();

  const { filename } = await params;
  const full = resolveStored(filename);

  // The file has to belong to an entry — an orphan from an abandoned dialog is
  // not something to serve, and this keeps the name from being a bearer token.
  const entry = await Transaction.findOne({ 'attachment.filename': filename })
    .select('attachment')
    .lean();
  if (!entry) throw notFound('That attachment is not attached to any entry.');

  let info;
  try {
    info = await stat(full);
  } catch {
    throw notFound('That attachment is missing from the server.');
  }

  const mimeType = entry.attachment?.mimeType ?? 'application/octet-stream';
  const disposition = INLINE.has(mimeType) ? 'inline' : 'attachment';
  const name = (entry.attachment?.originalName ?? 'receipt').replace(/["\\]/g, '');

  return new Response(Readable.toWeb(createReadStream(full)), {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(info.size),
      'Content-Disposition': `${disposition}; filename="${name}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
