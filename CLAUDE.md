# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next dev server (Turbopack) on :3000
npm run build          # Production build — must finish with no warnings
npm start              # Serve the production build
npm run seed           # Idempotent seed: budget lines + admin from SEED_ADMIN_*
node --env-file=.env.local scripts/seed.mjs --demo   # …plus demo users and ~40 entries

node docs/build-manual.mjs     # Rebuild docs/manual.html  (run npm run build first)
node docs/build-screens.mjs    # Rebuild docs/screens.html
```

**There is no test suite and no linter configured.** Verification is running the app and
exercising the flow. `npm run build` is the only automated gate, and the acceptance criteria
in `BUILD.md` §12 are the checklist. The seed never overwrites an existing user's password,
so re-running it against a live database is safe.

The doc build scripts read the webfont files that `next/font` downloaded into `.next/`, so a
build has to have happened first. Edit `docs/*.template.html`, never the generated `.html`.

## The rule the whole system exists to enforce

One person records money, a **different** person approves it. Until approval an entry is
inert: visible in the ledger, absent from every balance and report. Nothing is ever deleted —
mistakes are voided with a reason and stay visible. Every mutation appends to an audit log
that has no update or delete path anywhere in the API, and none may be added.

Read `BUILD.md` (the original specification) before changing behaviour; `MANUAL.md` and
`SCREENS.md` are the user-facing documents and describe what is currently true on screen.

## Architecture

### One query layer, two callers

`lib/queries.js` holds every non-trivial read (`listTransactions`, `reportSummary`,
`exceptions`, `activity`, balance helpers). It is imported by **both** Server Components and
API route handlers.

Pages fetch their initial data by calling `lib/` directly — never by `fetch`-ing this app's
own API. Client components (`'use client'`) call the API routes. Keep new read logic in
`lib/queries.js` rather than duplicating it on either side.

### The client/server boundary

`lib/enums.js` exists solely so client components can use the shared vocabulary (roles,
statuses, methods, labels) without dragging Mongoose into the browser bundle. The dependency
runs **models → enums**, never the reverse.

Never import `@/models/*` into a file marked `'use client'`.

`lib/format.js` (money, dates, CSV) is also client-safe and is the only place amounts and
dates get formatted.

### Route handlers

Every handler is wrapped in `handler()` from `lib/http.js`, which opens the cached connection
and converts thrown errors into the documented shape — `{ error, details? }` with 400 / 401 /
403 / 404 / 409. Signal failure by **throwing** `badRequest()`, `forbidden()`, `conflict()`,
`notFound()` rather than returning a response; Mongoose `ValidationError`, `CastError` and
duplicate-key errors are already mapped.

Every mutating route must call `writeAudit` from `lib/audit.js`, and `assertPeriodOpen(date)`
from `lib/period.js` before create, edit, void and approve.

### Auth

`requireUser()` / `requireRole()` in `lib/session.js` verify the JWT **and** re-read the user
from the database on every call, so deactivating someone takes effect immediately rather than
when their token expires. Signing uses `jose`, not `jsonwebtoken`, because it has to work in
both the Node and Edge runtimes.

`middleware.js` runs on the Edge, where Mongoose cannot, so it only checks that the session
cookie **exists**. Real authorisation lives in the route handler — that is where it is
actually enforced, and the UI hiding a button is never the control.

### Money rules that are easy to break

- **The running balance is computed, never stored.** `listTransactions` returns
  `openingBalance` (approved entries strictly before the range start) and walks the page
  assigning `runningBalance` to approved rows only; everything else gets `null`.
- **A running balance over a filtered subset is meaningless.** `isLedgerView()` returns false
  as soon as any non-date filter is applied, and the UI drops the Balance column entirely.
- Reports and the ledger's closing balance must reconcile for the same range, because both
  count approved entries only. If they ever disagree, that is a real defect.
- Amounts round to 2dp in the Mongoose setter. Signed arithmetic (`in` positive, `out`
  negative) is the `SIGNED` expression in `lib/queries.js`.

## Next.js 16 specifics

- `params` and `searchParams` are Promises: `const { id } = await params;`
- `cookies()` and `headers()` are async: `const store = await cookies();`
- Anything touching Mongoose declares `export const runtime = 'nodejs'` and
  `export const dynamic = 'force-dynamic'`. Every route and every `(app)` page already does;
  a prerendered page would try to reach Atlas at build time.
- `lib/db.js` caches the connection on `globalThis` and models are registered as
  `mongoose.models.X || mongoose.model('X', schema)` — serverless reuses warm containers and
  an unguarded connect exhausts the Atlas pool.

## Client-component state gotchas

Two bugs have come from the same root, so these are worth knowing:

- **Dialogs stay mounted between openings.** `EntryDialog` and friends are always rendered;
  only the `Modal` body unmounts. Every piece of state — including `busy` — must be reset in
  the `open` effect, or a successful save leaves the reopened dialog stuck showing "Saving".
- **Keep unstable callbacks out of effect dependencies.** Callers pass `onClose={() => …}`,
  a fresh function each render. `Modal` holds it in a ref and depends only on `[open]`;
  putting `onClose` in the dependency array re-runs the setup effect on every keystroke and
  steals focus out of the field being typed into.

## Design constraints (binding — see BUILD.md §10)

- Tailwind v4, CSS-first. All tokens live in the `@theme` block in `app/globals.css`.
  **There is no `tailwind.config.js`** and none should be added.
- Runtime dependencies are `mongoose`, `bcryptjs`, `jose` and nothing else. No UI kit, no
  icon package, no charting library (bars are `div`s), no date library (`Intl`).
  Icons are hand-drawn inline SVG in `components/Icons.jsx`; spreadsheet reading is a
  dependency-free unzip + XML parse in `lib/xlsx.js`.
- **Credit green and debit red are semantic, never decorative** — they encode the direction
  money moved. The brand accent is deep blue with teal; it never takes over those two roles.
- Every figure is monospace, `tabular-nums` and right-aligned. Digits that do not stack in a
  column are a real defect in a cashbook, not a cosmetic one.
- Works to 380px, visible focus rings, real `<label>` on every control.

## Environment

`MONGODB_URI` must carry the database name between the host and the `?`, or writes land
silently in `test`. The app throws a clear startup error if it or `JWT_SECRET` is missing.

**`CURRENCY` is inlined into the client bundle at build time** via the `env` block in
`next.config.mjs`, because client components format amounts. Changing it needs a rebuild —
setting it at runtime in `docker-compose.yml` will not change what the UI displays.
`MONGODB_URI` and `JWT_SECRET` are read at runtime and behave normally.

## Deployment

`.github/workflows/main.yml` builds the Dockerfile on push to `main` and pushes to GHCR;
`docker-compose.yml` runs that image with secrets from a server-side `.env`. The image build
runs `npm run build` with no environment at all, which works because every DB-touching route
is dynamic. `README.md` also documents the Vercel path.
