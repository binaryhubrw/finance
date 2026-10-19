'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { CLOSER_ROLES, OVERSIGHT_ROLES } from '@/lib/enums';
import { NAV_ICONS, SignOutIcon } from '@/components/Icons';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/approvals', label: 'Approvals', badge: true },
  { href: '/audit', label: 'Audit trail', only: OVERSIGHT_ROLES },
  { href: '/exceptions', label: 'Exceptions', only: OVERSIGHT_ROLES },
  { href: '/reports', label: 'Reports' },
  // Approvers close months, which lives in Settings; the rest of the page is admin only.
  { href: '/settings', label: 'Settings', only: CLOSER_ROLES },
];

export function NavLinks({ role, pendingCount = 0 }) {
  const pathname = usePathname();

  const visible = LINKS.filter((link) => {
    if (link.only && !link.only.includes(role)) return false;
    if (link.hideFrom && link.hideFrom.includes(role)) return false;
    return true;
  });

  return (
    <ul className="flex gap-1.5 overflow-x-auto nav:block nav:space-y-1 nav:overflow-visible">
      {visible.map((link) => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        const Icon = NAV_ICONS[link.href];

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors duration-140 ${
                active
                  ? 'bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon size={17} className={active ? 'text-[#37d0c4]' : 'text-white/55'} />
              <span className="flex-1">{link.label}</span>
              {link.badge && pendingCount > 0 ? (
                <span className="num rounded-full bg-[#37d0c4] px-2 text-[10px] font-semibold text-[#04302c]">
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

/**
 * `tone` follows the surface it sits on — the dark sidebar wants white text,
 * the header bar wants ink.
 */
export function SignOutButton({ compact = false, tone = 'panel' }) {
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
      className={`inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium transition-colors duration-140 ${
        tone === 'bar'
          ? 'px-2 py-1 text-ink-soft hover:bg-sunk hover:text-ink'
          : 'text-white/65 hover:text-white'
      } ${compact || tone === 'bar' ? '' : 'px-2 py-1 hover:bg-white/10'}`}
    >
      <SignOutIcon size={14} />
      {busy ? 'Signing out' : 'Sign out'}
    </button>
  );
}
