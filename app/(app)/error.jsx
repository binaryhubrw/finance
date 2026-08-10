'use client';

import ErrorPanel from '@/components/ErrorPanel';

/** Page-level failures, with the sidebar still in place. */
export default function AppError({ error, reset }) {
  return <ErrorPanel error={error} reset={reset} />;
}
