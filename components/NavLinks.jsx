'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/approvals', label: 'Approvals', badge: true },
  { href: '/audit', label: 'Audit trail', hideFrom: ['accountant'] },
  { href: '/exceptions', label: 'Exceptions', hideFrom: ['accountant'] },
  { href: '/reports', label: 'Reports' },
  // Auditors close months, which lives in Settings; the rest of the page is admin only.
  { href: '/settings', label: 'Settings', only: ['admin', 'auditor'] },
];

export function NavLinks({ role, pendingCount = 0 }) {
  const pathname = usePathname();

  const visible = LINKS.filter((link) => {
    if (link.only && !link.only.includes(role)) return false;
    if (link.hideFrom && link.hideFrom.includes(role)) return false;
    return true;
  });

  return (
    <ul className="flex gap-1 overflow-x-auto nav:block nav:gap-0 nav:overflow-visible">
      {visible.map((link) => {
        const active =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-between gap-2 whitespace-nowrap border-l-2 px-3 py-2 text-[13px] transition-colors duration-120 nav:px-4 ${
                active
                  ? 'border-l-paper bg-white/8 text-paper'
                  : 'border-l-transparent text-paper/65 hover:bg-white/5 hover:text-paper'
              }`}
            >
              {link.label}
              {link.badge && pendingCount > 0 ? (
                <span className="num rounded-sm border border-white/25 px-1.5 text-[10px] text-paper">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="text-[12px] text-paper/60 underline underline-offset-2 transition-colors duration-120 hover:text-paper"
    >
      {busy ? 'Signing out' : 'Sign out'}
    </button>
  );
}
