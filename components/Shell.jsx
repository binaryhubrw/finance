import Link from 'next/link';
import { ROLE_LABELS } from '@/lib/enums';
import { NavLinks, SignOutButton } from '@/components/NavLinks';

export default function Shell({ user, pendingCount, currency, children }) {
  return (
    <div className="min-h-screen">
      <aside className="sticky top-0 z-30 flex flex-col gap-3 border-b border-ink bg-ink px-3 py-3 text-paper nav:fixed nav:inset-y-0 nav:left-0 nav:w-[232px] nav:gap-0 nav:border-b-0 nav:px-0 nav:py-5">
        <div className="flex items-baseline justify-between gap-3 nav:block nav:px-4">
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-paper">Hub Ledger</p>
            <p className="label label-quiet mt-0.5 text-paper/50">Kigali · {currency}</p>
          </div>
          <div className="nav:hidden">
            <SignOutButton />
          </div>
        </div>

        <nav className="nav:mt-7" aria-label="Sections">
          <NavLinks role={user.role} pendingCount={pendingCount} />
        </nav>

        <div className="mt-auto hidden nav:block nav:px-4">
          <div className="border-t border-white/10 pt-4">
            <p className="text-[13px] text-paper">{user.name}</p>
            <p className="label label-quiet mt-0.5 text-paper/50">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Link
                href="/settings"
                className="text-[12px] text-paper/60 underline underline-offset-2 transition-colors duration-120 hover:text-paper"
              >
                Password
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 nav:px-8 nav:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
