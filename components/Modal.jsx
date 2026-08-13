'use client';

import { useEffect, useId, useRef } from 'react';
import { CloseIcon } from '@/components/Icons';

/** The only element in the app that casts a shadow. */
export default function Modal({ open, onClose, title, description, children, width = 560 }) {
  const panel = useRef(null);
  const titleId = useId();

  // Callers pass a fresh arrow function on every render. Holding it in a ref
  // keeps it out of the effect's dependencies — otherwise the effect tore down
  // and re-ran on every keystroke, pulling focus out of the field being typed
  // into and putting it back, which cost the user characters.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current();
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

    // A comma-separated querySelector returns whatever comes first in the
    // document, which is the dismiss button in the header. Ask for a field
    // first so the dialog opens ready to type into.
    const field = panel.current?.querySelector(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    (field ?? panel.current?.querySelector('button:not([disabled])'))?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

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
          <div className="min-w-0">
            <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.02em]">
              {title}
            </h2>
            {description ? <p className="mt-1 text-[13px] text-ink-soft">{description}</p> : null}
          </div>
          {/* Quiet, because every dialog already carries a named way out. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 shrink-0 rounded-md p-2 text-muted transition-colors duration-120 hover:bg-sunk hover:text-ink"
          >
            <CloseIcon size={17} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
