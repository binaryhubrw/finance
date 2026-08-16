'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Field from '@/components/Field';
import Logo from '@/components/Logo';

const PROMISES = [
  'Every franc in and out, with the receipt behind it',
  'Approved before it counts towards the balance',
  'An audit trail nothing can be deleted from',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setDetails({});

    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setDetails(err.details ?? {});
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper nav:grid nav:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="brand-panel flex flex-col justify-between px-6 py-10 nav:px-14 nav:py-14">
        <div className="flex items-center gap-3">
          <Logo size={38} />
          <span>
            <span className="block text-[16px] font-bold leading-tight tracking-[-0.02em] text-white">
              UR Binary Hub
            </span>
            <span className="block text-[11px] text-white/60">University of Rwanda · Kigali</span>
          </span>
        </div>

        <div className="mt-14 max-w-md nav:mt-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#37d0c4]">
            Finance
          </p>
          <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[-0.03em] text-white nav:text-[36px]">
            The hub&rsquo;s money, accounted for.
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed text-white/70">
            The accountant records the day. The approver clears it. Nothing counts towards the
            balance until it has been reviewed.
          </p>

          <ul className="mt-8 space-y-3">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-start gap-3 text-[13px] text-white/80">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#37d0c4]" />
                {promise}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-14 text-[11px] text-white/45 nav:mt-0">
          Records kept in {process.env.CURRENCY || 'RWF'}
        </p>
      </section>

      <section className="flex items-center px-6 py-12 nav:px-14">
        <form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
          <h2 className="text-[24px] font-bold tracking-[-0.025em]">Sign in</h2>
          <p className="mt-1.5 text-[13px] text-ink-soft">
            Use the account your administrator set up for you.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-md border border-debit/30 bg-debit/5 px-3.5 py-2.5 text-[13px] text-debit"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 space-y-4">
            <Field
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              error={details.email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Field
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              error={details.password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary mt-7 w-full py-3" disabled={busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </button>

          <p className="mt-7 text-[12px] text-ink-soft">
            Forgotten your password? An administrator can reset it from Settings.
          </p>
        </form>
      </section>
    </div>
  );
}
