# Hub Ledger

A cashbook for a coworking and innovation hub in Kigali. The accountant records every franc
in and out, with a date, budget line, payment method and receipt reference. The auditor
approves the spending before it counts, and can later see exactly what was entered, what
changed and what is missing.

Two rules shape everything else:

- **Nothing counts until it is approved.** A pending entry appears in the ledger and in the
  approval queue, but it does not move the running balance and it does not appear in reports.
- **Nothing is ever deleted.** There is no delete route. An entry that should not stand is
  voided with a reason and stays visible, dimmed and struck through. Every change writes a
  row to an append-only audit log.

Amounts are in **RWF** (set with `CURRENCY`).

---

## Who does what

| Role | Can do |
|---|---|
| `accountant` | Records entries; edits or voids **their own** entries **while still pending**; reads the ledger and reports; exports CSV |
| `auditor` | Approves, rejects and voids; reads the full audit trail and the exceptions page; closes months; exports. **Cannot record or edit entries** |
| `admin` | Everything an auditor can do, plus managing people and budget lines |
| `viewer` | Read-only |

Separation of duties is enforced in the route handlers, not in the interface:

- **Nobody approves their own entry.** If the entry's `recordedBy` is the signed-in user, the
  approve and reject routes return 403. Set `ALLOW_SELF_APPROVAL=true` only if one person
  really does have to do both jobs.
- The `auditor` role is deliberately blocked from `POST /api/transactions` and
  `PATCH /api/transactions/[id]`.
- The interface hides buttons a role cannot use, but every route checks again.

The Settings page is where budget lines, people and the monthly close live. Administrators
see all of it; auditors see the monthly close, because closing months is their job; everyone
can reach it to change their own password.

---

## Prerequisites

- Node 20 or newer
- A MongoDB Atlas cluster (or any MongoDB you can reach)

## Setup in four commands

```bash
cp .env.example .env.local     # then fill in MONGODB_URI and JWT_SECRET
npm install
npm run seed                   # add --demo for example data: npm run seed -- --demo
npm run dev
```

Open http://localhost:3000 and sign in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`,
then change that password from Settings.

`npm run seed` is safe to run repeatedly. It adds any missing budget lines, creates the
administrator if that email is not already registered, and never overwrites an existing
password. `npm run seed -- --demo` also creates an accountant and an auditor and fills the
book with about forty entries across the last three months, including a few that trip the
exception checks, so every screen has something in it.

## Environment

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/hub_ledger?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=generate-with-openssl-rand-base64-32
CURRENCY=RWF
ALLOW_SELF_APPROVAL=false
LARGE_AMOUNT_THRESHOLD=100000
SEED_ADMIN_NAME=Hub Admin
SEED_ADMIN_EMAIL=admin@hub.rw
SEED_ADMIN_PASSWORD=change-me-on-first-login
```

The database name `hub_ledger` sits between the host and the `?`. A connection string
without one silently writes everything to a database called `test`.

Generate the secret with `openssl rand -base64 32`. The app throws a clear error on the
first request if `MONGODB_URI` or `JWT_SECRET` is missing.

`.env.local` holds real secrets and is gitignored. `.env.example` is committed and holds
placeholders only.

---

## Deploying to Vercel

1. Set `MONGODB_URI`, `JWT_SECRET`, `CURRENCY`, `ALLOW_SELF_APPROVAL` and
   `LARGE_AMOUNT_THRESHOLD` in **Vercel → Settings → Environment Variables**, for all three
   environments (Production, Preview, Development). The `SEED_ADMIN_*` variables are only
   needed on your own machine.
2. In **Atlas → Network Access**, allow `0.0.0.0/0`. Vercel's serverless functions have no
   fixed egress IP, so an IP allowlist will fail in production.
3. Run the seed **locally** against the Atlas connection string once — `npm run seed` — not
   on Vercel.
4. Cookies are set `httpOnly`, `sameSite: 'lax'`, and `secure` in production.

### One caveat worth knowing

The login rate limit (10 attempts per 15 minutes, keyed on email and IP) is held in an
in-memory `Map`. On serverless that map lives inside one warm instance, so the limit is
**per instance**, not global — a determined attacker spread across instances gets more
attempts than the number suggests. It is the right trade-off at this scale; if the hub ever
needs a hard limit, move the counter into MongoDB or Redis.

---

## The monthly routine

1. The **accountant** records entries as the money moves, with a receipt reference or a link
   to a photo of the receipt on every expense.
2. The **auditor** clears the approval queue — ideally daily, at worst weekly. Nothing counts
   towards the balance until they do.
3. The auditor works through **Exceptions**: expenses with no receipt, entries edited after
   review, large amounts, backdated entries, possible duplicates, and anything that has been
   waiting more than a week.
4. Reconcile the book against the **bank statement and the mobile money statement**, and
   count the cash in the drawer.
5. **Close the month** from Settings: pick the month, enter the cash you physically counted,
   check the variance against the book balance, and confirm. Closing is refused while any
   entry in that month is still pending, and afterwards nothing dated inside that month can
   be created, edited, voided or approved. An administrator can reopen a month, and the
   reopening is logged.

---

## How it is built

One Next.js 16 project holding both the interface and the API, JavaScript throughout,
Tailwind CSS v4 configured in `app/globals.css` with no `tailwind.config.js`, MongoDB
through Mongoose, and a JWT in an httpOnly cookie. No UI component library, no charting
library, no icon library, no date library — bars are `div`s and dates go through `Intl`.

```
lib/         db, session, audit, period, http, format, enums, queries, api
models/      User, Category, Transaction, AuditLog, ClosedPeriod
components/  Shell, NavLinks, Modal, Field, Money, LedgerTable, EntryDialog,
             FilterBar, Bars, Figure, MonthPicker, ReviewActions, AuditTrail,
             ExceptionSections, ReportView, SettingsPanels
app/         (app)/… screens, api/… route handlers, login
scripts/     seed.mjs
```

Pages are Server Components that read their data straight from `lib/` rather than fetching
their own API. Interactive pieces — filters, dialogs, approve buttons — are `'use client'`
components that call the API routes. `lib/queries.js` holds the read logic the pages and the
routes share, so the ledger you see and the JSON the API returns can never drift apart.
`lib/enums.js` holds the shared vocabulary so client components can import it without
dragging Mongoose into the browser bundle.

`middleware.js` runs on the Edge, where Mongoose cannot, so it only checks whether the
session cookie exists and sends signed-out visitors to `/login`. Verifying the token and
checking the role happens inside each route handler. (Next 16 prints a deprecation notice
suggesting `proxy.js`; the file is kept as `middleware.js` for now.)

The running balance is computed, never stored: `GET /api/transactions` returns the sum of
approved amounts before the range as `openingBalance` and walks the page in date order.
Because a running balance over a filtered subset would be meaningless, it is only computed
when dates are the only filter in play — otherwise the response says `isLedgerView: false`
and the column disappears.

---

## Out of scope, and possible later work

No file upload storage — the receipt field holds a URL, and a Drive link is fine. No
multi-currency, no double-entry accounts, no invoicing, no bank feed import, no email
notifications. Each of those would be a reasonable next step, roughly in that order.
