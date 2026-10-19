# UR Binary Hub — Finance

A cashbook for a coworking and innovation hub in Kigali. The accountant records every franc
in and out, with a date, budget line, payment method and receipt reference. The approver
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

## Documentation

This README is for whoever runs the system. The two documents below are for the people who
use it, and are worth handing to a new accountant or approver on their first day.

| Document | Covers |
|---|---|
| [MANUAL.md](MANUAL.md) | How the system works: the four roles, the five rules, the life of an entry, each screen, the monthly routine, and the messages people hit. |
| [SCREENS.md](SCREENS.md) | Every control on every screen — what each button does and which roles can use it. |

Both are also published as web pages under `docs/`. `docs/manual.html` and
`docs/screens.html` are built by `node docs/build-manual.mjs` and `node docs/build-screens.mjs`,
which inline the two webfonts so the pages carry no external dependencies. Run `npm run build`
first — the scripts read the font files that `next/font` fetched. Edit the matching
`*.template.html`, not the built output.

---

## Who does what

Every entry passes through four people, in order:

1. **Initiator** records it.
2. **Approver 1** checks it.
3. **Accountant** pays out or confirms receipt, recording the date and a reference.
4. **Approver 2** gives the final approval. Only then does it count towards balances and reports.

Any approver or the accountant can instead **return** it to the initiator with a reason; the
initiator's correction restarts it at Approver 1.

| Role key | Shown in the interface | Can do |
|---|---|---|
| `initiator` | Initiator | Records and imports entries; edits or voids **their own** while waiting for Approver 1 or after a return |
| `approver1` | Approver 1 | First approval or return; voids; reads the audit trail and exceptions; closes months |
| `accountant` | Accountant | Confirms the payment or receipt after Approver 1 |
| `approver2` | Approver 2 | Final approval or return; voids; reads the audit trail and exceptions; closes months |
| `admin` | Administrator | Can act at any stage (never twice on one entry), plus people and budget lines |
| `viewer` | **Auditor** | Read-only: the ledger, reports, the audit trail and the exceptions page |

Upgrading an existing database: run `node --env-file=.env.local scripts/migrate-four-stage-flow.mjs`
once (old accountants become initiators, old approvers become Approver 1, approved entries are
kept and marked legacy), then assign the Accountant and Approver 2 roles in Settings.

Separation of duties is enforced in the route handlers, not in the interface:

- **Nobody acts twice on the same entry.** The initiator, Approver 1, the accountant and
  Approver 2 must be four different people; the approve and reject routes return 403 to anyone
  who already took part, the administrator included.
- Only the role that owns a stage may act on it (`POST /api/transactions/[id]/approve` is
  stage-aware); the administrator may act at any stage.
- The interface hides buttons a role cannot use, but every route checks again.

The Settings page is where budget lines, people and the monthly close live. Administrators
see all of it; approvers see the monthly close, because closing months is their job; everyone
can reach it to change their own password.

---

## Design

The interface carries UR Binary Hub branding: a deep blue primary (`#123c7a`) with teal
accents for the innovation side of the hub, a near-white canvas, navy text, rounded cards
with subtle shadows, a hand-drawn icon set and generous spacing. The brand gradient and the
faint circuit grid appear on the sidebar and the login pane.

Two rules survive from the earlier cashbook design because they are not decoration:

- **Green and red only ever mean direction of money.** Credit green (`#0f7a54`) and debit red
  (`#c0392b`) are never used for emphasis, status or anything else. Teal fills the accent role
  they would otherwise be pulled into.
- **Every figure is tabular monospace and right-aligned**, and the running-balance column
  keeps its own ruled, tinted lane. Digits that do not stack in a column are a real defect in
  a ledger, not a cosmetic one.

The tokens live in the `@theme` block in `app/globals.css`; nothing else hard-codes a colour.
Icons are hand-drawn inline SVG in `components/Icons.jsx` rather than an icon package.

> This supersedes §10 of `BUILD.md`, which specified a paper-and-ink cashbook aesthetic and
> forbade gradients, rounded cards with shadows and icons. That section was overridden
> deliberately in favour of the UR Binary Hub brand direction.

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
password. `npm run seed -- --demo` also creates an accountant and an approver and fills the
book with about forty entries across the last three months, including a few that trip the
exception checks, so every screen has something in it.

## Environment

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/hub_ledger?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=generate-with-openssl-rand-base64-32
CURRENCY=RWF
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

1. Set `MONGODB_URI`, `JWT_SECRET`, `CURRENCY` and
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

## Importing a spreadsheet

The ledger's **Import a sheet** button takes an `.xlsx` straight from Excel, Numbers or
Google Sheets, or a `.csv`. Download the template from the dialog, fill in one row per entry,
and upload it.

| Column | Required | Notes |
|---|---|---|
| Date | yes | `dd/mm/yyyy`, `yyyy-mm-dd`, or a real Excel date cell |
| Direction | yes | `in` or `out` (also accepts Money in / income / expense / credit / debit) |
| Amount | yes | `45000`, `45,000` and `45 000` all work; no currency code needed |
| Budget line | yes | Must match an active budget line by name |
| Description | yes | Up to 300 characters |
| Paid to or received from, Method, Reference, Receipt link, Note | no | Method defaults to Cash |

Nothing is written until you confirm. The upload is first checked row by row against the same
rules the entry dialog enforces — a real date, not in the future, a positive amount, a budget
line that matches the direction, and a month that is still open — and the result is shown as a
table before anything is saved. **A sheet with any bad row imports nothing**: a half-imported
cashbook is harder to unpick than a rejected file. Up to 500 rows and 2MB at a time.

Imported entries land as `pending` like any other, so the approver still approves them one by
one, and each one gets its own audit row noting the file it came from.

The reader is in `lib/xlsx.js` — an `.xlsx` is a ZIP of XML parts, and Node can already
inflate and parse both, so it stays a dependency-free file rather than pulling in a library.
It reads values only; formatting, formulas and charts are ignored.

## Email notifications

Two layers, following the INUMA integration guide: [lib/mailer.js](lib/mailer.js) is the
transport and knows nothing about the ledger; [lib/email.js](lib/email.js) holds the templates
and one function per event and knows nothing about SMTP. Swapping to another provider means
replacing `mailer.js` alone, as long as it still exports `sendEmail` / `verifyMailer` /
`closeMailer`.

**The settings are built into the code, not read from the environment**, because production
runs from an image where nobody can add variables. The defaults live in
[lib/mailer.js](lib/mailer.js) (relay `10.20.61.125`, From `urbinaryhub@ur.ac.rw`) and
[lib/app-url.js](lib/app-url.js) (`https://finance.urbinaryhub.rw`, which every link in every
email is built from).

Nothing secret is being committed: the relay has no username or password, its address is an
internal one that is useless from outside UR, and the From is a public mailbox.

Each can still be overridden by an environment variable where one can be set:

```bash
UR_SMTP_HOST=…        UR_SMTP_PORT=25       # port defaults to 25
UR_MAIL_FROM=…        UR_MAIL_FROM_NAME=…
FRONTEND_URL=…        # overrides the built-in link origin
```

The relay has **no username or password** — it accepts mail from trusted internal addresses,
so the transporter authenticates by where it runs. On a host outside that range every send
fails with a 5xx. Check with `nc -zv $UR_SMTP_HOST 25`, then `npm run verify:email`.

Because the relay is built in, a developer machine will try to reach it and fail with
`Connection timeout` — harmless, logged, and nothing else is affected. To see the messages
locally, point the app at a capture server with `UR_SMTP_HOST=127.0.0.1 UR_SMTP_PORT=2525`.

| Event | Who is told |
|---|---|
| Entry recorded, imported or batch-recorded | Approvers and administrators, except whoever recorded it |
| Entry edited after review, so back in the queue | Approvers and administrators, except the editor |
| Entry approved, rejected or voided | Whoever recorded it, with the reviewer's comment |
| Comment left on an entry | The recorder and the reviewer, except the commenter |
| Month closed or reopened | Approvers and administrators, except whoever did it |
| Account created | The new person — never with the password, which is handed over directly |
| Role changed, account deactivated or restored, password reset by an admin | That person |
| Own password changed | That person, as a security confirmation |

Two rules hold everywhere:

- **A failed email never fails the operation.** Sends go through `notify()`, which catches
  everything and logs `[email] notification failed: …`. Verified by killing the relay
  mid-flight: the entry still saved, `201` in 1.8s.
- **`notify()` does not block the response.** An approval must not wait on a relay that hangs
  for ten seconds. The consequence is that on a platform which freezes the process the moment
  a response is returned, in-flight sends would be cut short. The Docker deployment is a
  long-running server, so they complete; the same caveat as the in-process login rate limit.

---

## The monthly routine

1. The **accountant** records entries as the money moves, with a receipt reference or a link
   to a photo of the receipt on every expense.
2. The **approver** clears the approval queue — ideally daily, at worst weekly. Nothing counts
   towards the balance until they do.
3. The approver works through **Exceptions**: expenses with no receipt, entries edited after
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
through Mongoose, and a JWT in an httpOnly cookie. No UI component library, no charting library,
no icon package and no date library — bars are `div`s, icons are inline SVG and dates go
through `Intl`. The spreadsheet reader is hand-rolled too, so the dependency list is still
just `mongoose`, `bcryptjs` and `jose`.

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
