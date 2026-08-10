'use client';

import { useId } from 'react';

/**
 * A real <label> tied to a real control, with room for a hint and an error.
 * Pass `as="select"` / `as="textarea"`, or children for a custom control.
 */
export default function Field({
  label,
  hint,
  error,
  as = 'input',
  className = '',
  children,
  numeric = false,
  ...props
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const fieldClass = `field ${numeric ? 'field-num' : ''} ${error ? 'field-error' : ''}`;

  let control;
  if (children) {
    control = children(id, fieldClass, describedBy);
  } else if (as === 'select') {
    control = (
      <select id={id} className={fieldClass} aria-describedby={describedBy} {...props} />
    );
  } else if (as === 'textarea') {
    control = (
      <textarea id={id} className={fieldClass} rows={3} aria-describedby={describedBy} {...props} />
    );
  } else {
    control = (
      <input id={id} className={fieldClass} aria-describedby={describedBy} {...props} />
    );
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="label mb-1.5 block">
        {label}
      </label>
      {control}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[12px] text-debit">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[12px] text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
