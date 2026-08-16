'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { EyeIcon } from '@/components/Icons';

const fileSize = (bytes) => {
  const kb = (bytes ?? 0) / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

/**
 * Opens a row's receipt without leaving the page. An approver checking an amount
 * against its receipt should not have to lose the table to do it.
 *
 * Images render directly. PDFs go in an <object>, which uses the browser's own
 * viewer — rendering them any other way would mean a PDF library, and the
 * dependency list is deliberately short. Either way the file is fetched from
 * the same authenticated route, so nothing here widens who can read a receipt.
 */
export default function AttachmentPreview({ attachment, compact = false }) {
  const [open, setOpen] = useState(false);
  if (!attachment?.filename) return null;

  const src = `/api/attachments/${attachment.filename}`;
  const isImage = String(attachment.mimeType ?? '').startsWith('image/');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn btn-sm ${compact ? 'px-2 py-1' : ''}`}
        title={`Preview ${attachment.originalName}`}
      >
        <EyeIcon size={13} />
        Preview
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={attachment.originalName || 'Receipt'}
        description={`${fileSize(attachment.size)} · attached to this entry`}
        width={900}
      >
        <div className="flex min-h-[320px] items-center justify-center rounded-md border border-rule bg-sunk p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- an arbitrary
            // uploaded file behind an auth route, not a build-time asset.
            <img
              src={src}
              alt={attachment.originalName || 'Receipt'}
              className="max-h-[70vh] w-auto max-w-full rounded-sm object-contain"
            />
          ) : (
            <object data={src} type={attachment.mimeType} className="h-[70vh] w-full rounded-sm">
              <p className="p-6 text-center text-[13px] text-ink-soft">
                This browser cannot show {attachment.originalName} inline.{' '}
                <a className="link" href={src} target="_blank" rel="noreferrer noopener">
                  Open it in a new tab
                </a>
                .
              </p>
            </object>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <a className="link text-[13px]" href={src} target="_blank" rel="noreferrer noopener">
            Open in a new tab
          </a>
          <button type="button" className="btn" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}
