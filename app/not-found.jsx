import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="eyebrow">Page 404</p>
      <h1 className="page-title mt-3">That page is not in this book</h1>
      <p className="mt-2 text-ink-soft">
        The link may be out of date, or the record may have been renamed.
      </p>
      <p className="mt-6">
        <Link href="/" className="link">
          Go to the overview
        </Link>
      </p>
    </main>
  );
}
