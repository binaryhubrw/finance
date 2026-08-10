'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Field from '@/components/Field';

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
    <div className="min-h-screen nav:grid nav:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col justify-between bg-ink px-6 py-10 text-paper nav:px-12 nav:py-14">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.02em]">Hub Ledger</p>
          <p className="label label-quiet mt-1 text-paper/50">Kigali innovation hub</p>
        </div>

        <div className="mt-12 max-w-sm nav:mt-0">
          <h1 className="text-[22px] leading-[1.25] text-paper">
            Every franc in and out, and the person who approved it.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-paper/65">
            The accountant records the day. The auditor approves it. Nothing counts towards the
            balance until it has been reviewed, and nothing is ever deleted.
          </p>
        </div>

        <p className="label label-quiet mt-12 text-paper/40 nav:mt-0">
          Records kept in {process.env.CURRENCY || 'RWF'}
        </p>
      </section>

      <section className="flex items-center px-6 py-12 nav:px-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
          <h2 className="text-[18px]">Sign in</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Use the account your administrator set up for you.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-sm border border-debit/40 bg-debit/5 px-3 py-2 text-[13px] text-debit"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-5 space-y-4">
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

          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </button>

          <p className="mt-6 text-[12px] text-ink-soft">
            Forgotten your password? An administrator can reset it from Settings.
          </p>
        </form>
      </section>
    </div>
  );
}
