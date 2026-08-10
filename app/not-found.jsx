import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="label">Page 404</p>
      <h1 className="mt-3 text-[22px]">That page is not in this book</h1>
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
