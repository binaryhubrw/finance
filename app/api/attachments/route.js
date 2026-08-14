import { handler, ok, badRequest } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { saveUpload } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stores a receipt and hands back a descriptor. The entry dialog sends that
 * descriptor when it saves, so the file is on disk before the transaction
 * refers to it — a record never points at a receipt that failed to upload.
 *
 * Only the roles that may record entries may attach to them.
 */
export const POST = handler(async (request) => {
  await requireRole('accountant', 'admin');

  let form;
  try {
    form = await request.formData();
  } catch {
    throw badRequest('Attach the receipt as a file upload.');
  }

  const attachment = await saveUpload(form.get('file'));
  return ok({ attachment }, 201);
});
