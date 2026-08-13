'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ROLE_LABELS, ROLE_SUMMARIES, ROLES } from '@/lib/enums';
import { formatDate, formatMonth, money } from '@/lib/format';
import Money from '@/components/Money';
import Modal from '@/components/Modal';
import Field from '@/components/Field';

function Notice({ tone = 'ok', children }) {
  if (!children) return null;
  return (
    <p
      role="status"
      className={`mt-3 rounded-sm border px-3 py-2 text-[13px] ${
        tone === 'error' ? 'border-debit/40 bg-debit/5 text-debit' : 'border-rule bg-sunk text-ink-soft'
      }`}
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------------------- password */

export function AccountPanel({ user }) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setDetails({});
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setCurrent('');
      setNext('');
      setMessage('Your password is changed. Use it the next time you sign in.');
    } catch (err) {
      setError(err.message);
      setDetails(err.details ?? {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card px-4 py-4">
      <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Your account</h2>
      <p className="mt-1 text-[12px] text-ink-soft">
        Signed in as {user.name} · {ROLE_LABELS[user.role]}
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          error={details.currentPassword}
          onChange={(event) => setCurrent(event.target.value)}
          required
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={newPassword}
          error={details.newPassword}
          onChange={(event) => setNext(event.target.value)}
          required
        />
        <div className="sm:col-span-2">
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving' : 'Change password'}
          </button>
        </div>
      </form>

      <Notice tone="error">{error}</Notice>
      <Notice>{message}</Notice>
    </section>
  );
}

/* ---------------------------------------------------------- budget lines */

export function CategoriesPanel({ categories }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: '', monthlyBudget: '' });
  const [adding, setAdding] = useState({ name: '', kind: 'expense', monthlyBudget: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(work) {
    setBusy(true);
    setError('');
    try {
      await work();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const startEdit = (category) => {
    setEditing(category._id);
    setDraft({
      name: category.name,
      monthlyBudget: category.monthlyBudget === null ? '' : String(category.monthlyBudget),
    });
  };

  return (
    <section className="card">
      <div className="px-4 py-4">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Budget lines</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          Every entry sits on a line. Lines in use cannot be removed — deactivate them instead and
          they stay on old entries.
        </p>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_150px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              await api('/api/categories', {
                method: 'POST',
                body: {
                  name: adding.name,
                  kind: adding.kind,
                  monthlyBudget: adding.monthlyBudget === '' ? null : Number(adding.monthlyBudget),
                },
              });
              setAdding({ name: '', kind: 'expense', monthlyBudget: '' });
            });
          }}
        >
          <Field
            label="New line"
            value={adding.name}
            onChange={(event) => setAdding({ ...adding, name: event.target.value })}
            required
          />
          <Field label="Kind" as="select" value={adding.kind}>
            {(id, fieldClass) => (
              <select
                id={id}
                className={fieldClass}
                value={adding.kind}
                onChange={(event) => setAdding({ ...adding, kind: event.target.value })}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            )}
          </Field>
          <Field
            label="Monthly budget"
            type="number"
            min="0"
            step="1"
            numeric
            value={adding.monthlyBudget}
            onChange={(event) => setAdding({ ...adding, monthlyBudget: event.target.value })}
          />
          <div className="flex items-end">
            <button type="submit" className="btn" disabled={busy || !adding.name.trim()}>
              Add line
            </button>
          </div>
        </form>

        <Notice tone="error">{error}</Notice>
      </div>

      <div className="overflow-x-auto border-t border-rule">
        <table className="t min-w-[620px]">
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col" className="w-[110px]">Kind</th>
              <th scope="col" className="w-[160px] text-right">Monthly budget</th>
              <th scope="col" className="w-[210px]" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category._id} className={category.active ? undefined : 'text-muted'}>
                <td>
                  {editing === category._id ? (
                    <input
                      className="field"
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      aria-label={`Name for ${category.name}`}
                    />
                  ) : (
                    <span className="text-[13px]">
                      {category.name}
                      {category.active ? '' : ' · inactive'}
                    </span>
                  )}
                </td>
                <td className="text-[13px] text-ink-soft">
                  {category.kind === 'in' || category.kind === 'income' ? 'Income' : 'Expense'}
                </td>
                <td className="text-right">
                  {editing === category._id ? (
                    <input
                      className="field field-num"
                      type="number"
                      min="0"
                      value={draft.monthlyBudget}
                      onChange={(event) =>
                        setDraft({ ...draft, monthlyBudget: event.target.value })
                      }
                      aria-label={`Monthly budget for ${category.name}`}
                    />
                  ) : category.monthlyBudget ? (
                    <Money value={category.monthlyBudget} />
                  ) : (
                    <span className="label label-quiet">not set</span>
                  )}
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    {editing === category._id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await api(`/api/categories/${category._id}`, {
                                method: 'PATCH',
                                body: {
                                  name: draft.name,
                                  monthlyBudget:
                                    draft.monthlyBudget === '' ? null : Number(draft.monthlyBudget),
                                },
                              });
                              setEditing(null);
                            })
                          }
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => startEdit(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() =>
                            run(() =>
                              api(`/api/categories/${category._id}`, {
                                method: 'PATCH',
                                body: { active: !category.active },
                              }),
                            )
                          }
                        >
                          {category.active ? 'Deactivate' : 'Restore'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- people */

export function PeoplePanel({ people, currentUserId }) {
  const router = useRouter();
  const [adding, setAdding] = useState({ name: '', email: '', role: 'accountant', password: '' });
  const [resetting, setResetting] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState(false);

  async function run(work) {
    setBusy(true);
    setError('');
    setDetails({});
    try {
      await work();
      router.refresh();
    } catch (err) {
      setError(err.message);
      setDetails(err.details ?? {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="px-4 py-4">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">People</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          Separation of duties is the point: whoever records the money should not be the person who
          approves it.
        </p>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 nav:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_150px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              await api('/api/auth/users', { method: 'POST', body: adding });
              setAdding({ name: '', email: '', role: 'accountant', password: '' });
            });
          }}
        >
          <Field
            label="Name"
            value={adding.name}
            error={details.name}
            onChange={(event) => setAdding({ ...adding, name: event.target.value })}
            required
          />
          <Field
            label="Email"
            type="email"
            value={adding.email}
            error={details.email}
            onChange={(event) => setAdding({ ...adding, email: event.target.value })}
            required
          />
          <Field label="Role" as="select" value={adding.role}>
            {(id, fieldClass) => (
              <select
                id={id}
                className={fieldClass}
                value={adding.role}
                onChange={(event) => setAdding({ ...adding, role: event.target.value })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label="First password"
            type="password"
            autoComplete="new-password"
            value={adding.password}
            error={details.password}
            onChange={(event) => setAdding({ ...adding, password: event.target.value })}
            required
          />
          <div className="flex items-end">
            <button type="submit" className="btn" disabled={busy}>
              Add person
            </button>
          </div>
        </form>

        <p className="mt-2 text-[12px] text-ink-soft">
          {ROLE_SUMMARIES[adding.role]}
        </p>

        <Notice tone="error">{error}</Notice>
      </div>

      <div className="overflow-x-auto border-t border-rule">
        <table className="t min-w-[720px]">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col" className="w-[170px]">Role</th>
              <th scope="col" className="w-[150px]">Last signed in</th>
              <th scope="col" className="w-[210px]" />
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const isSelf = person.id === currentUserId;
              return (
                <tr key={person.id} className={person.active ? undefined : 'text-muted'}>
                  <td>
                    <p className="text-[13px]">
                      {person.name}
                      {isSelf ? ' · you' : ''}
                      {person.active ? '' : ' · deactivated'}
                    </p>
                    <p className="label label-quiet mt-1">{person.email}</p>
                  </td>
                  <td>
                    <select
                      className="field"
                      value={person.role}
                      disabled={isSelf || busy}
                      aria-label={`Role for ${person.name}`}
                      onChange={(event) =>
                        run(() =>
                          api(`/api/auth/users/${person.id}`, {
                            method: 'PATCH',
                            body: { role: event.target.value },
                          }),
                        )
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="num text-[12px] text-ink-soft">
                    {person.lastLoginAt ? formatDate(person.lastLoginAt) : 'never'}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setResetting(person);
                          setNewPassword('');
                        }}
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={isSelf || busy}
                        onClick={() =>
                          run(() =>
                            api(`/api/auth/users/${person.id}`, {
                              method: 'PATCH',
                              body: { active: !person.active },
                            }),
                          )
                        }
                      >
                        {person.active ? 'Deactivate' : 'Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        title={`Reset the password for ${resetting?.name ?? ''}`}
        description="Hand it over in person and ask them to change it after signing in."
        width={460}
      >
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={newPassword}
          error={details.password}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => setResetting(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || newPassword.length < 8}
            onClick={() =>
              run(async () => {
                await api(`/api/auth/users/${resetting.id}`, {
                  method: 'PATCH',
                  body: { password: newPassword },
                });
                setResetting(null);
              })
            }
          >
            Reset password
          </button>
        </div>
      </Modal>
    </section>
  );
}

/* ----------------------------------------------------------- month close */

export function PeriodsPanel({ months, periods, canReopen }) {
  const router = useRouter();
  const [month, setMonth] = useState(months[0]?.key ?? '');
  const [countedCash, setCountedCash] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = months.find((option) => option.key === month);
  const counted = countedCash === '' ? null : Number(countedCash);
  const variance =
    selected && counted !== null && Number.isFinite(counted)
      ? counted - selected.bookBalance
      : null;

  async function run(work) {
    setBusy(true);
    setError('');
    try {
      await work();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="px-4 py-4">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Close a month</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          Closing freezes every entry dated inside the month. Clear the approval queue first, then
          count the cash and record what you actually hold.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 nav:grid-cols-4">
          <Field label="Month" as="select" value={month}>
            {(id, fieldClass) => (
              <select
                id={id}
                className={fieldClass}
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                {months.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                    {option.closed ? ' · closed' : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="Cash you counted"
            type="number"
            step="0.01"
            numeric
            hint="Leave empty if you are not reconciling cash"
            value={countedCash}
            onChange={(event) => setCountedCash(event.target.value)}
          />

          <Field
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="sm:col-span-2"
          />
        </div>

        {selected ? (
          <div className="mt-4 grid grid-cols-2 divide-x divide-rule border-y border-rule nav:grid-cols-4">
            <div className="px-3 py-3">
              <p className="label">Book balance</p>
              <p className="mt-1.5">
                <Money value={selected.bookBalance} />
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="label">Counted</p>
              <p className="mt-1.5">
                {counted === null ? (
                  <span className="num text-[13px] text-muted">–</span>
                ) : (
                  <Money value={counted} />
                )}
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="label">Variance</p>
              <p className="mt-1.5">
                {variance === null ? (
                  <span className="num text-[13px] text-muted">–</span>
                ) : (
                  <Money
                    value={variance}
                    tone={variance === 0 ? 'plain' : variance > 0 ? 'in' : 'out'}
                  />
                )}
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="label">Still pending</p>
              <p className="mt-1.5 text-[13px]">
                {selected.pending === 0 ? 'none' : `${selected.pending} to review`}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !selected || selected.closed}
            onClick={() =>
              run(async () => {
                const [year, monthNumber] = month.split('-').map(Number);
                await api('/api/periods', {
                  method: 'POST',
                  body: {
                    year,
                    month: monthNumber,
                    countedCash: countedCash === '' ? null : Number(countedCash),
                    note,
                  },
                });
                setCountedCash('');
                setNote('');
              })
            }
          >
            {selected?.closed
              ? `${selected.label.split(' ')[0]} is already closed`
              : `Close ${selected ? selected.label.split(' ')[0] : 'month'}`}
          </button>
        </div>

        <Notice tone="error">{error}</Notice>
      </div>

      <div className="overflow-x-auto border-t border-rule">
        <table className="t min-w-[640px]">
          <thead>
            <tr>
              <th scope="col">Closed month</th>
              <th scope="col" className="text-right">Book balance</th>
              <th scope="col" className="text-right">Counted</th>
              <th scope="col" className="text-right">Variance</th>
              <th scope="col" className="w-[120px]" />
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period._id}>
                <td>
                  <p className="text-[13px]">{formatMonth(period.year, period.month)}</p>
                  <p className="label label-quiet mt-1">
                    Closed by {period.closedBy?.name ?? 'someone since removed'} ·{' '}
                    {formatDate(period.createdAt)}
                  </p>
                  {period.note ? (
                    <p className="mt-1 text-[12px] text-ink-soft">{period.note}</p>
                  ) : null}
                </td>
                <td className="text-right">
                  <Money value={period.closingBalance} />
                </td>
                <td className="text-right">
                  {period.countedCash === null ? (
                    <span className="num text-[13px] text-muted">–</span>
                  ) : (
                    <Money value={period.countedCash} />
                  )}
                </td>
                <td className="text-right">
                  {period.variance === null ? (
                    <span className="num text-[13px] text-muted">–</span>
                  ) : (
                    <Money
                      value={period.variance}
                      tone={period.variance === 0 ? 'plain' : period.variance > 0 ? 'in' : 'out'}
                    />
                  )}
                </td>
                <td className="text-right">
                  {canReopen ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() =>
                        run(() => api(`/api/periods/${period._id}`, { method: 'DELETE' }))
                      }
                    >
                      Reopen
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {periods.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[13px] text-ink-soft">
                  No month has been closed yet. Close the oldest complete month once its queue is
                  clear.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ClosedMonthsHint({ periods }) {
  if (!periods.length) return null;
  const latest = periods[0];
  return (
    <p className="text-[12px] text-ink-soft">
      The book is frozen up to {formatMonth(latest.year, latest.month)} with a closing balance of{' '}
      {money(latest.closingBalance)}.
    </p>
  );
}
