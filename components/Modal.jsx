'use client';

import { useEffect, useId, useRef } from 'react';

/** The only element in the app that casts a shadow. */
export default function Modal({ open, onClose, title, description, children, width = 560 }) {
  const panel = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const focusable = panel.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previous = document.activeElement;
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('input, select, textarea, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[2px] sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth: width }}
        className="w-full rounded-xl border border-rule bg-surface shadow-lift"
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
          <div>
            <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.02em]">
              {title}
            </h2>
            {description ? <p className="mt-1 text-[13px] text-ink-soft">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="btn btn-sm" aria-label="Close">
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
