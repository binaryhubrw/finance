# Hub Ledger — Build Specification

Build this application exactly as specified. It is a single Next.js project containing both
the interface and the API, deployed to Vercel, backed by MongoDB Atlas. Work through the
whole spec in one pass: scaffold, models, API, auth, screens, seed script, README.

Read §10 (Design) carefully and treat it as binding. A generic AI-looking dashboard is a
failed build even if every feature works.

---

## 1. What this is

A hub (a coworking / innovation space in Kigali) tracks its cash. Two people matter:

- **The accountant** records every franc in and out, with a date, budget line, payment
  method and receipt reference.
- **The auditor** (the hub owner) approves spending before it counts, and later needs to
  check exactly what the accountant entered, what changed, and what is missing.

Nothing the accountant enters affects the balance until the auditor approves it. Nothing is
ever deleted or silently edited — every change writes to an append-only audit log.

Currency is **RWF**, set via env. Amounts support 2 decimal places but are usually whole.

---

## 2. Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), JavaScript, not TypeScript |
| React | 19 |
| Node | 20+ |
| Styling | Tailwind CSS v4 — CSS-first config, `@theme` block in `app/globals.css`, **no `tailwind.config.js`** |
| Database | MongoDB Atlas via Mongoose 8 |
| Auth | JWT in an httpOnly cookie |
| Hosting | Vercel |

**No UI component library.** No shadcn, no Material, no Chakra, no DaisyUI. No charting
library — bars are `div`s. No icon library — see §10. No date library; use `Intl`.
Only additional dependencies allowed: `mongoose`, `bcryptjs`, `jose`.

Use `jose` (not `jsonwebtoken`) for signing and verifying — it works in both the Node and
Edge runtimes.

### Next.js 16 specifics that break naive code

- `params` and `searchParams` are **Promises**. Always `const { id } = await params;`
- `cookies()` and `headers()` are **async**. Always `const store = await cookies();`
- Any route handler touching Mongoose must declare `export const runtime = 'nodejs';`
  and `export const dynamic = 'force-dynamic';`
- Mongoose cannot run in middleware (Edge). `middleware.js` only checks whether the session
  cookie **exists** and redirects unauthenticated users to `/login`. Real authorisation —
  verifying the token and checking the role — happens inside each route handler, which is
  where it is actually enforced.

---

## 3. Repo layout

```
hub-ledger/
├── package.json
├── next.config.mjs
├── jsconfig.json                 # "@/*" -> "./*"
├── middleware.js
├── .env.example                  # placeholders only, committed
├── .env.local                    # real secrets, gitignored
├── .gitignore
├── README.md
├── lib/
│   ├── db.js                     # cached Mongoose connection
│   ├── session.js                # signToken, readSession, requireUser, requireRole
│   ├── audit.js                  # diff(), writeAudit()
│   ├── period.js                 # assertPeriodOpen()
│   ├── http.js                   # ok(), fail(), handler() wrapper
│   └── format.js                 # money, dates, CSV — used by client components
├── models/
│   ├── User.js  Category.js  Transaction.js  AuditLog.js  ClosedPeriod.js
├── scripts/
│   └── seed.mjs                  # `npm run seed`
├── components/
│   ├── Shell.jsx  NavLinks.jsx  Modal.jsx  Field.jsx  Money.jsx
│   ├── LedgerTable.jsx  EntryDialog.jsx  FilterBar.jsx  Bars.jsx
└── app/
    ├── layout.jsx  globals.css  loading.jsx  not-found.jsx
    ├── login/page.jsx
    ├── (app)/
    │   ├── layout.jsx            # Shell: sidebar + main, loads session server-side
    │   ├── page.jsx              # Overview
    │   ├── ledger/page.jsx
    │   ├── approvals/page.jsx
    │   ├── audit/page.jsx
    │   ├── exceptions/page.jsx
    │   ├── reports/page.jsx
    │   └── settings/page.jsx
    └── api/
        ├── auth/{login,logout,me,change-password}/route.js
        ├── auth/users/route.js          auth/users/[id]/route.js
        ├── categories/route.js          categories/[id]/route.js
        ├── transactions/route.js        transactions/[id]/route.js
        ├── transactions/[id]/{approve,reject,void}/route.js
        ├── audit/route.js               audit/{exceptions,activity}/route.js
        ├── reports/summary/route.js
        └── periods/route.js             periods/[id]/route.js
```

Pages are Server Components that fetch initial data directly through `lib/` (not through
`fetch` to own API). Interactive pieces — filters, dialogs, approve buttons — are
`'use client'` components that call the API routes.

---

## 4. Environment

`.env.example` (committed, placeholders only):

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.il6ebhq.mongodb.net/hub_ledger?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=generate-with-openssl-rand-base64-32
CURRENCY=RWF
ALLOW_SELF_APPROVAL=false
LARGE_AMOUNT_THRESHOLD=100000
SEED_ADMIN_NAME=Hub Admin
SEED_ADMIN_EMAIL=admin@hub.rw
SEED_ADMIN_PASSWORD=change-me-on-first-login
```

Note the database name `hub_ledger` sits between the host and the `?` — a connection string
without one silently writes to `test`.

`.gitignore` must include `.env*.local`, `.env`, `node_modules`, `.next`, `.vercel`.

The app must throw a clear startup error if `MONGODB_URI` or `JWT_SECRET` is missing.

### Vercel deployment notes for the README

1. Set `MONGODB_URI`, `JWT_SECRET`, `CURRENCY`, `ALLOW_SELF_APPROVAL`,
   `LARGE_AMOUNT_THRESHOLD` in Vercel → Settings → Environment Variables, for all three
   environments. `SEED_ADMIN_*` are only needed locally.
2. In Atlas → Network Access, allow `0.0.0.0/0`. Vercel's serverless functions have no
   fixed egress IP, so an IP allowlist will fail in production.
3. Run the seed **locally** against the Atlas URI once (`npm run seed`), not on Vercel.
4. Cookies are set with `secure: true` in production, `sameSite: 'lax'`, `httpOnly: true`.

### `lib/db.js` — required pattern

Serverless invocations reuse warm containers, so an unguarded `mongoose.connect` opens a new
pool every request and exhausts Atlas connections. Cache on `globalThis`:

```js
let cached = globalThis._mongoose ?? (globalThis._mongoose = { conn: null, promise: null });

export async function db() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

Guard model registration the same way: `mongoose.models.User || mongoose.model('User', schema)`.

---

## 5. Roles

| Role | Can do |
|---|---|
| `accountant` | Create entries; edit or void **their own** entries **while still pending**; view ledger and reports; export CSV |
| `auditor` | Approve, reject, void; read the full audit trail and exceptions; close months; export. **Cannot create or edit entries** |
| `admin` | Everything an auditor can, plus manage users and budget lines |
| `viewer` | Read-only |

Enforced server-side, in the route handler, not the UI:

- **Nobody approves their own entry.** If `recordedBy` equals the session user, return 403.
  Bypass only when `ALLOW_SELF_APPROVAL=true` (default false).
- `auditor` is deliberately blocked from `POST /api/transactions` and
  `PATCH /api/transactions/[id]`. Separation of duties is the point — do not "helpfully"
  allow it.
- The UI hides buttons the role cannot use, but every route re-checks.

---

## 6. Models

### User
```
name, email (unique, lowercase), passwordHash (select:false),
role: enum ['admin','auditor','accountant','viewer'] default 'viewer',
active: Boolean default true, lastLoginAt: Date, timestamps
```
`setPassword(plain)` — bcrypt cost 10, min 8 chars. `checkPassword(plain)`.
`toJSON` strips `passwordHash`.

### Category
```
name (unique), kind: enum ['income','expense'], monthlyBudget: Number|null,
active: Boolean default true, timestamps
```

### Transaction
```
date: Date required
description: String required max 300
category: ObjectId ref Category required
type: enum ['in','out'] required
amount: Number required min 0.01, rounded to 2dp in the setter
method: enum ['cash','mobile_money','bank','other'] default 'cash'
reference: String            // receipt no. or MoMo transaction ID
receiptUrl: String           // link to a photo, e.g. Drive
payee: String
note: String max 500

status: enum ['pending','approved','rejected','void'] default 'pending'
recordedBy: ObjectId ref User required
reviewedBy: ObjectId ref User default null
reviewedAt: Date default null
reviewNote: String
editedAfterReview: Boolean default false
timestamps
```
Indexes: `date`, `{status, date}`, `{category, date}`, `{recordedBy, date}`.
Only `approved` affects any balance. Everything else is visible but inert.

### AuditLog — append-only
```
entity: enum ['transaction','category','user','period']
entityId: ObjectId
action: enum ['create','update','approve','reject','void','close','reopen','login']
actor: ObjectId ref User
actorName: String            // denormalised so the trail survives a rename
at: Date default now
summary: String              // "Changed amount 40,000 → 45,000"
changes: [{ field, from, to }]
snapshot: Mixed              // the document as it stood after the action
```
Indexes: `{entity, entityId, at}`, `{at:-1}`, `{actor, at:-1}`.

Every mutating route calls `writeAudit`. There is no route that updates or deletes an
AuditLog document, and none may be added.

### ClosedPeriod
```
year, month (unique together), closingBalance, countedCash: Number|null,
variance: Number|null, note, closedBy: ObjectId ref User, timestamps
```

---

## 7. Rules

1. **Approval gates the balance.** Pending entries appear in the ledger but do not move the
   running balance and do not appear in reports.
2. **Rejection requires a reason** (`reviewNote`, non-empty).
3. **Nothing is deleted.** There is no `DELETE /api/transactions/[id]`. `POST .../void`
   sets `status: 'void'` with a required reason; the entry stays visible, dimmed, reason
   shown.
4. **Edits after review reset the review.** Editing an `approved` or `rejected` entry sets
   `editedAfterReview: true`, returns `status` to `pending`, clears `reviewedBy` /
   `reviewedAt`, and logs it. The Approvals queue marks these "re-submitted after edit".
5. **Closed months are frozen.** `assertPeriodOpen(date)` runs before create, edit, void and
   approve; 409 with a message pointing the user to an open month. Closing is refused while
   any entry in that month is still pending.
6. **Running balance is computed, never stored.** `GET /api/transactions` returns
   `openingBalance` (sum of signed approved amounts strictly before the range start) and
   walks the page in date order assigning `runningBalance` to approved rows only; others get
   `null`. A running balance over a filtered subset is meaningless — compute it only when
   the sole filters are dates, otherwise return `isLedgerView: false` and hide the column.
7. **Login is rate-limited** to 10 attempts per 15 minutes, keyed on email + IP, held in an
   in-memory Map (acceptable at this scale; note the serverless caveat in the README). A
   successful login writes an audit entry and updates `lastLoginAt`.

---

## 8. API

All under `/api`. Session comes from the httpOnly cookie. Errors are always
`{ error: "a sentence the user can act on", details?: { field: msg } }` with status 400
(validation), 401 (signed out), 403 (wrong role), 404, 409 (closed period / duplicate).

```
POST   /auth/login            {email, password} -> sets cookie, returns user
POST   /auth/logout
GET    /auth/me
POST   /auth/change-password  {currentPassword, newPassword}
GET    /auth/users            admin
POST   /auth/users            admin
PATCH  /auth/users/[id]       admin   — cannot demote or deactivate yourself

GET    /categories?all=true
POST   /categories            admin
PATCH  /categories/[id]       admin
DELETE /categories/[id]       admin — 409 if any transaction uses it; tell the user to
                                      deactivate it instead

GET    /transactions?from&to&type&method&status&category&recordedBy&search&page&limit
       -> { items, page, pages, total, isLedgerView, openingBalance,
            summary: { moneyIn, moneyOut, approvedIn, approvedOut, net, pending } }
GET    /transactions/[id]     -> entry + its audit history
POST   /transactions          accountant, admin
PATCH  /transactions/[id]     accountant (own + pending), admin
POST   /transactions/[id]/approve   auditor, admin
POST   /transactions/[id]/reject    auditor, admin  {reviewNote}
POST   /transactions/[id]/void      auditor, admin  {reviewNote}

GET    /audit?entity&entityId&actor&action&from&to&page&limit
GET    /audit/exceptions?from&to
GET    /audit/activity?days=30
GET    /reports/summary?from&to
GET    /periods
POST   /periods               auditor, admin  {year, month, countedCash?, note?}   — close
DELETE /periods/[id]          admin — reopen, logged
```

`/audit/exceptions` returns six lists, each capped at 100 — this is the page the auditor
opens first:

| Key | Meaning |
|---|---|
| `missingReceipt` | `type:'out'`, status pending or approved, no `reference` and no `receiptUrl` |
| `editedAfterReview` | `editedAfterReview === true` |
| `largeAmounts` | `amount >= LARGE_AMOUNT_THRESHOLD` |
| `backdated` | `createdAt` more than 7 days after `date` |
| `possibleDuplicates` | pairs sharing amount + date + category |
| `staleUnapproved` | pending for more than 7 days |

`/reports/summary` returns, from a **single `$facet` aggregation** over approved
transactions: `openingBalance, moneyIn, moneyOut, net, closingBalance, transactionCount,
pending:{count,amount}, byMonth[], byCategory[], byMethod[]`.

---

## 9. Screens

Sidebar: Overview · Ledger · Approvals (pending-count badge) · Audit trail · Exceptions ·
Reports · Settings (admin). Audit trail and Exceptions are hidden from `accountant`.

**Login** — two panes. Left: ink field, product name, one honest line about what the app
does. Right: email, password, sign in. No demo credentials printed on screen.

**Overview** — month picker defaulting to this month. Figures: opening balance, money in,
money out, **closing balance** (the headline), awaiting approval (count + total, links to
Approvals). Below: month-by-month in/out bars, and the five largest expenses this month.

**Ledger** — the core screen. Filters: date range, direction, budget line, method, status,
search, recorded by. Table columns:

`Date · Description (payee, reference and budget line beneath) · Method · Status · Money in · Money out · Balance`

- Opening-balance row above the first entry.
- Pending rows carry a 3px amber marker on the left edge; void rows are dimmed with the
  description struck through and the reason shown.
- "Record entry" (accountant/admin) opens the dialog. "Export CSV" exports the current
  filtered view, client-side, amounts as bare numbers.

**Entry dialog** — date (defaults today, no future dates), in/out toggle, amount, budget
line (filtered to the direction), description, payee, method, reference, receipt URL, note.
On save, state plainly that it is now waiting for approval.

**Approvals** — pending entries, oldest first, each showing everything needed to decide
without clicking through: description, amount, budget line, who recorded it and when,
receipt reference, plus a warning line when the receipt is missing or the entry was edited
after a previous review. Approve / Reject; Reject demands a reason. Empty state: "Nothing
waiting. The accountant is up to date."

**Audit trail** — every logged action, newest first. Filters for person, action and date.
Each row: timestamp, actor, action, entity, and field-level changes rendered as
`amount: 40,000 → 45,000`. Expanding a row shows the snapshot. Read-only; the UI offers no
way to alter it.

**Exceptions** — the six lists as collapsible sections, each with a count and one line on
why it matters ("An expense with no receipt reference cannot be verified later"). Rows link
into the ledger. Empty sections collapse to a quiet "Nothing flagged".

**Reports** — range picker with month / quarter / year shortcuts. Summary figures, spending
by budget line as bars with amount and share (and budget vs actual where `monthlyBudget` is
set), income by budget line, split by payment method, month-by-month table. CSV per table.

**Settings** (admin) — budget lines (add, rename, set budget, deactivate), people (add,
change role, deactivate, reset password), and month close (pick month, enter the cash you
physically counted, see book balance and variance before confirming; closed months listed
with a reopen action).

---

## 10. Design — binding

The brief is *minimalist and distinctive*. The reference object is a ruled paper cashbook,
not a SaaS dashboard.

### Forbidden — these are the tells of generated design

No purple or indigo accent (`#6366F1`, `violet-600` and neighbours). No gradient anywhere —
not on buttons, headers, cards or text. No grid of `rounded-2xl` cards with `shadow-lg`. No
glassmorphism, blur panels or animated blobs. No emoji in the interface. No icon library and
no icon-in-a-tinted-rounded-square next to every heading. No hero section. No cream
background with a serif display face and a terracotta accent. No near-black page with a
single acid-green accent. No `text-transparent bg-clip-text`. No sparkle or rocket
metaphors in copy. No pill-shaped buttons.

### Tokens — `app/globals.css`

```css
@import "tailwindcss";

@theme {
  --color-paper:       #eef0ea;
  --color-surface:     #ffffff;
  --color-sunk:        #f8f9f5;
  --color-ink:         #12171c;
  --color-ink-soft:    #47514e;
  --color-muted:       #79817b;
  --color-rule:        #dcdfd6;
  --color-rule-strong: #c3c7bc;
  --color-credit:      #12664a;   /* money in */
  --color-debit:       #a03528;   /* money out */
  --color-accent:      #1f4b5c;   /* interactive */
  --color-flag:        #8a6410;   /* awaiting review */

  --font-sans: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;

  --radius-sm: 3px;
  --radius-md: 6px;
}
```

Use only these. Green and red are load-bearing — they encode the direction money moved and
must never be used decoratively. There is exactly one shadow in the app, on the modal.
Border radius never exceeds 6px except status badges.

### Type

Load **Instrument Sans** (interface) and **IBM Plex Mono** (every number, date, reference,
and all small-caps labels) with `next/font/google`. Not Inter, not Geist.

Every figure gets `font-variant-numeric: tabular-nums` and right alignment. This is a
cashbook; digits that do not stack in a column are a real defect, not a cosmetic one.

Field labels, table headers and stat labels are 10px mono, uppercase, `tracking-[0.1em]`,
muted. Headings are sans, 600 weight, `tracking-[-0.02em]`, and small — 22px is the largest
type in the app. Body 14px.

### Signature element — the balance rail

In the ledger table, the running-balance column is separated from everything left of it by a
1px `rule-strong` vertical line and sits on the `sunk` background, running the full height
of the table. It should read as the ruled balance column of a physical cashbook. Pending
rows show a faint dash there, never a number — the visual gap *is* the message that the
entry has not counted yet.

Spend the design boldness there. Everything else stays quiet: hairline rules instead of
shadows, generous row padding, one accent colour used sparingly.

### Structure

Dark ink sidebar, fixed, 232px, collapsing to a horizontal bar under 860px. Content on
paper. Cards are white with a 1px rule border, no shadow. Tables have a sunk header row and
hairline row separators.

### Copy

Active voice, sentence case, plain verbs. Buttons name the outcome: "Record entry",
"Approve", "Close March". Errors say what happened and what to do: "March 2026 is closed.
Record the correction in an open month instead." Empty states invite an action rather than
apologise. No exclamation marks.

### Quality floor — meet it without announcing it

Works down to 380px. Visible keyboard focus rings. Real `<label>` on every control.
`prefers-reduced-motion` respected. Transitions no longer than 120ms and only on hover
states. Text contrast at least 4.5:1.

---

## 11. Seed

`npm run seed` runs `scripts/seed.mjs`, is idempotent, and loads `.env.local`.

Budget lines — *income:* Grants & donations · Membership & desk fees · Event & training
income · Other income. *Expense:* Rent · Utilities · Internet & airtime · Salaries &
stipends · Equipment & repairs · Events & catering · Transport · Supplies · Bank & mobile
money charges.

Then create the admin from `SEED_ADMIN_*` if that email does not already exist, printing a
reminder to change the password. Never overwrite an existing user's password.

With `--demo`, also create an accountant and an auditor and roughly 40 transactions across
the last three months in a mix of statuses, including a few that will trip the exception
rules, so every screen has something in it.

---

## 12. Acceptance checklist

- [ ] `npm install && npm run seed && npm run dev` works against Atlas with no errors
- [ ] `npm run build` completes clean — no unused-import or hook-dependency warnings
- [ ] An accountant records an entry; it shows as pending with no balance
- [ ] That accountant cannot approve it — 403 from the API, not merely a hidden button
- [ ] An auditor approves it; the running balance moves by exactly that amount
- [ ] Editing an approved entry returns it to pending and flags it as edited
- [ ] Voiding keeps the entry visible with its reason and removes it from the balance
- [ ] The audit trail shows create, edit, approve and void with correct before/after values
- [ ] An expense with no reference and no receipt URL appears under Exceptions
- [ ] Closing a month with a pending entry is refused with a clear message
- [ ] After closing, an entry dated inside that month returns 409
- [ ] Report totals reconcile with the ledger's closing balance for the same range
- [ ] CSV opens in a spreadsheet with amounts as numbers
- [ ] Usable at 380px wide
- [ ] Nothing in §10's forbidden list appears anywhere in the UI

---

## 13. Out of scope

No file upload storage (the receipt field holds a URL — a Drive link is fine), no
multi-currency, no double-entry accounts, no invoicing, no bank feed import, no email
notifications. List these in the README as possible later work.

---

## 14. README

Cover: what the app is; the four roles and what each can do; prerequisites; setup in four
commands; the environment variables; the Vercel and Atlas deployment steps from §4; a note
that the login rate limit is in-process and therefore per-instance on serverless; and a
short **monthly routine** — accountant records daily → auditor clears the approval queue →
auditor reviews exceptions → reconcile against bank and mobile money statements → close the
month.
