import Link from 'next/link';
import { ROLE_LABELS } from '@/lib/enums';
import { NavLinks, SignOutButton } from '@/components/NavLinks';
import Logo from '@/components/Logo';

export default function Shell({ user, pendingCount, currency, children }) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen">
      {/* The sidebar carries the brand and the sections. Who you are signed in
          as, and how to stop being signed in, live in the header instead. */}
      <aside className="brand-panel sticky top-0 z-30 flex flex-col gap-4 px-4 py-4 nav:fixed nav:inset-y-0 nav:left-0 nav:w-64 nav:gap-0 nav:px-4 nav:py-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={34} />
          <span>
            <span className="block text-[15px] font-bold leading-tight tracking-[-0.02em] text-white">
              UR Binary Hub
            </span>
            <span className="block text-[11px] text-white/60">Finance · {currency}</span>
          </span>
        </Link>

        <nav className="nav:mt-8" aria-label="Sections">
          <NavLinks role={user.role} pendingCount={pendingCount} />
        </nav>
      </aside>

      <div className="shell-main">
        <header className="border-b border-rule bg-surface nav:sticky nav:top-0 nav:z-20">
          <div className="mx-auto flex w-full max-w-[1240px] items-center justify-end gap-1 px-4 py-2 nav:px-10">
            <Link
              href="/settings"
              className="flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1 transition-colors duration-140 hover:bg-sunk"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[11px] font-bold text-teal-deep">
                {initials}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {user.name}
                </span>
                <span className="block text-[11px] text-muted">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </span>
            </Link>

            <span className="mx-1 hidden h-6 w-px bg-rule sm:block" aria-hidden="true" />

            <SignOutButton tone="bar" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-4 py-7 nav:px-10 nav:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
