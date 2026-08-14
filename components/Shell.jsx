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
      <aside className="brand-panel sticky top-0 z-30 flex flex-col gap-4 px-4 py-4 nav:fixed nav:inset-y-0 nav:left-0 nav:w-64 nav:gap-0 nav:px-4 nav:py-6">
        <div className="flex items-center justify-between gap-3 nav:block">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={34} />
            <span>
              <span className="block text-[15px] font-bold leading-tight tracking-[-0.02em] text-white">
                UR Binary Hub
              </span>
              <span className="block text-[11px] text-white/60">Finance · {currency}</span>
            </span>
          </Link>
          <div className="nav:hidden">
            <SignOutButton compact />
          </div>
        </div>

        <nav className="nav:mt-8" aria-label="Sections">
          <NavLinks role={user.role} pendingCount={pendingCount} />
        </nav>

        <div className="mt-auto hidden nav:block">
          <div className="rounded-lg border border-white/12 bg-white/8 px-3 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#37d0c4] text-[11px] font-bold text-[#04302c]">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-white">
                  {user.name}
                </span>
                <span className="block text-[11px] text-white/60">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 border-t border-white/12 pt-2.5">
              <Link
                href="/settings"
                className="rounded-md px-2 py-1 text-[12px] font-medium text-white/65 transition-colors duration-140 hover:bg-white/10 hover:text-white"
              >
                Password
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <main className="mx-auto w-full max-w-[1240px] px-4 py-7 nav:px-10 nav:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
