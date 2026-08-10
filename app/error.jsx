'use client';

import ErrorPanel from '@/components/ErrorPanel';

/**
 * Catches failures in the signed-in layout itself — most often the database
 * being unreachable, which happens before the sidebar can be rendered.
 */
export default function RootError({ error, reset }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <p className="text-[15px] font-semibold tracking-[-0.02em]">Hub Ledger</p>
      <div className="mt-5">
        <ErrorPanel error={error} reset={reset} />
      </div>
    </main>
  );
}
