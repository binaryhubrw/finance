'use client';

// In production Next redacts the message, so this only narrows things down in
// development. The fallback wording has to stand on its own either way.
const OFFLINE = /Mongo|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|querySrv/i;

export default function ErrorPanel({ error, reset }) {
  const offline = OFFLINE.test(error?.message ?? '');

  return (
    <div className="card px-5 py-8">
      <p className="label">{offline ? 'Database' : 'Error'}</p>
      <h1 className="mt-1 text-[22px]">
        {offline ? 'The book cannot be reached' : 'That did not load'}
      </h1>
      <p className="mt-2 max-w-prose text-[13px] text-ink-soft">
        {offline
          ? 'The database did not answer. Check that you are online and that your Atlas cluster allows this network, then try again.'
          : 'This page could not be loaded, usually because the database did not answer. Try again, and if it keeps happening send the reference below to whoever maintains the app.'}
      </p>
      <p className="mt-2 max-w-prose text-[13px] text-ink-soft">
        Nothing was lost. No entry is written until its save succeeds.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        {error?.digest ? <p className="label label-quiet">Reference {error.digest}</p> : null}
      </div>
    </div>
  );
}
