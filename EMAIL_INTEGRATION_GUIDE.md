# Email Notification System — Integration Guide

How email works in INUMA (`inuma_bn`), and how to port the same setup into another system.

> This describes the code as it actually is today. The older `EMAIL_NOTIFICATIONS_SUMMARY.md` still
> documents `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS` — those are **legacy and unused**. The live
> transport is the UR SMTP relay, configured with the `UR_*` keys below.

---

## 1. Architecture in one picture

```
Business services (request, user, invitation, announcement, …)
        │  call typed methods
        ▼
EmailService                       src/services/email.service.ts
  · builds HTML + plain-text bodies from shared template helpers
  · one method per notification kind
        │  calls sendEmail({ to, subject, html, text })
        ▼
ur-mailer                          src/utils/ur-mailer.ts
  · lazy singleton nodemailer transporter (pooled SMTP)
  · reads UR_SMTP_HOST / UR_MAIL_FROM / UR_MAIL_FROM_NAME
        │
        ▼
UR SMTP relay (port 25, no auth, IP-trusted)
```

Two layers, deliberately: **transport** knows nothing about the product, **service** knows nothing
about SMTP. When porting, you almost always keep the service layer and swap the transport.

---

## 2. Configuration keys

### Required

| Key | Example | Purpose |
|---|---|---|
| `UR_SMTP_HOST` | `10.20.61.125` | SMTP relay host. Without it the transporter throws on first use. |
| `UR_MAIL_FROM` | `urbinaryhub@ur.ac.rw` | Envelope/From address. Without it `sendEmail` throws unless `from` is passed per-call. |
| `FRONTEND_URL` | `https://inuma.ur.ac.rw` | Base URL for every action link in every email. Falls back to `http://localhost:3000`. |

### Optional

| Key | Default | Purpose |
|---|---|---|
| `UR_MAIL_FROM_NAME` | *(none)* | Display name. When set, From becomes `"Name" <address>`; otherwise the bare address. |
| `ANNOUNCEMENT_SEND_CONCURRENCY` | `3` | Parallel sends during bulk announcements. Keep it ≤ the transporter's `maxConnections`. |

### Deliberately absent

There is **no SMTP username or password**. The UR relay accepts mail from trusted internal IPs, so
the transporter authenticates by network position. This is the single biggest thing to get right when
porting: on any host outside that trusted range, the relay refuses and every send fails with a 5xx.

`.env.example` excerpt:

```bash
FRONTEND_URL=http://localhost:3000

# UR SMTP relay (ur.ac.rw) — primary email transport
UR_SMTP_HOST=10.20.61.125
UR_MAIL_FROM=urbinaryhub@ur.ac.rw
UR_MAIL_FROM_NAME="UR Binary Hub"
```

---

## 3. The transport layer

[src/utils/ur-mailer.ts](src/utils/ur-mailer.ts) — ~90 lines, the whole SMTP surface.

```ts
transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: 25,                          // plain SMTP, hardcoded
  secure: false,                     // no implicit TLS
  tls: { rejectUnauthorized: false },// relay uses a self-signed cert
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  pool: true,                        // reuse sockets across sends
  maxConnections: 3,
  maxMessages: 100,
});
```

Design points worth carrying over:

- **Lazy singleton.** `getTransporter()` builds on first send, then caches. Importing the module
  never opens a socket, so tests and CLI scripts stay cheap.
- **Env read at module load.** `UR_SMTP_HOST` etc. are captured in module-scope consts, so
  `dotenv/config` must be imported *before* this module. Every entry point does this already.
- **Pooling with tight caps.** Three sockets, 100 messages each, then recycle. Shared relays throttle
  aggressive senders; the caps are politeness, not a performance ceiling.
- **Short timeouts.** 5s connect, 10s socket. A hung relay fails fast instead of holding an HTTP
  request open.
- **`rejectUnauthorized: false`** is required because the relay presents a self-signed certificate on
  port 25. Drop it and every send fails TLS verification. If your relay has a valid cert, remove it.

Exported API:

```ts
sendEmail(opts: EmailOptions): Promise<SendResult>  // to, subject, text?, html?, cc?, bcc?,
                                                    // replyTo?, from?, attachments?
verifyMailer(): Promise<void>                       // SMTP handshake check, throws on failure
closeMailer(): void                                 // tear down pool (tests, graceful shutdown)
```

`SendResult` carries `{ messageId, accepted, rejected, response }` — `rejected` is what the service
layer inspects to turn a partial delivery into an error.

---

## 4. The service layer

[src/services/email.service.ts](src/services/email.service.ts) — templates plus one method per
notification kind.

### Core dispatch

```ts
async sendEmail(options: { to: string; subject: string; html: string; text?: string }) {
  const info = await sendUrEmail({ ...options });
  if (info.rejected?.length) throw new Error(`Failed to send email: ${info.rejected.join(', ')}`);
}
```

Everything else in the class ends in a call to this. It always **throws** on failure — swallowing
happens at the call site, not here, so bulk senders can distinguish success from failure.

### Template helpers

| Helper | Role |
|---|---|
| `baseTemplate(bodyHtml, accentColor)` | Table-based 600px shell: accent bar, logo + "INUMA" wordmark, body, footer with confidentiality notice and © year. |
| `actionLink(href, label, color)` | Table-wrapped button (Outlook-safe — no `<button>`, no flexbox). |
| `signInReminder()` | Grey callout linking to `${FRONTEND_URL}/login`, appended to action-required emails. |
| `escapeHtml(value)` | Entity-escapes `& < > " '`. |
| `toParagraphs(value)` | Escapes, then splits blank-line-separated text into `<p>`, single newlines to `<br />`. |
| `renderAnnouncementHtml/Text(input)` | Exported so the admin preview endpoint renders through the exact same code as delivery. |

Colour semantics, applied consistently as the accent bar:

| Colour | Const | Meaning |
|---|---|---|
| `#0d47a1` blue | `BRAND_COLOR` | Informational / new item to review |
| `#16a34a` green | `COLOR_GREEN` | Approved, completed |
| `#dc2626` red | `COLOR_RED` | Rejected, deactivated |
| `#d97706` amber | `COLOR_AMBER` | Action required — query, password reset |

Every method builds **both** `html` and `text`. Don't skip the text part: plain-text alternatives
materially improve spam scoring and are what most filters read first.

> **Escaping caveat, important when porting.** Only announcement bodies go through `escapeHtml` —
> they are admin free-text, so they are treated as untrusted. All other interpolations
> (`documentTypeName`, `queryMessage`, `comments`, `rejectionReason`, user names) are inlined raw.
> That is safe only for the degree that those fields are validated upstream. If your system lets
> less-trusted users author any of those strings, route them through `escapeHtml` too.

### Method catalogue

Positional arguments, all returning `Promise<void>`, all throwing on failure.

**Account & auth**

| Method | Signature (after `toEmail`) | Subject |
|---|---|---|
| `sendInvitationEmail` | `positionName, invitationToken, organisationName` | `INUMA — Invitation to Join` |
| `sendAccountSetupInvitationEmail` | `name, setupToken` | `INUMA — Account Invitation` |
| `sendLoginCodeEmail` | `code, name` | `INUMA — Login Verification Code` |
| `sendPasswordResetEmail` | `name, resetToken` | `INUMA — Password Reset Request` |
| `sendUserAccountStatusNotification` | `toName, newStatus: 'activated'\|'deactivated', updatedBy` | `INUMA — Account {Status}` |

**Request workflow**

| Method | Signature (after `toEmail, toName`) | Subject |
|---|---|---|
| `sendRequestSubmittedNotification` | `documentTypeName, submittedBy, requestId` | `INUMA — New Request: {type} [Ref: {id}]` |
| `sendRequestStatusUpdateNotification` | `documentTypeName, newStatus, updatedBy, requestId, comments?` | `INUMA — Request {Status}: …` |
| `sendRequestQueryNotification` | `documentName, queryMessage, queriedBy, requestId, documentTypeName?` | `INUMA — Query on your request` |
| `sendRequestApprovalNotification` | `documentTypeName, approvedBy, approvalPosition, requestId` | `INUMA — Request Approved: …` |
| `sendRequestRejectionNotification` | `documentTypeName, rejectedBy, requestId, rejectionReason?` | `INUMA — Request Not Approved: …` |
| `sendReportSubmittedNotification` | `documentTypeName, submittedBy, requestId` | `INUMA — Report Submitted: …` |

**Documents**

| Method | Signature | Subject |
|---|---|---|
| `sendDocumentApprovalNotification` | `toEmail, toName, documentName, approvedBy, approvalPosition, requestId, documentTypeName?` | `INUMA — Attachment Approved: …` |
| `sendDocumentAutoApprovedNotification` | `toEmail, requesterName, documentTypeName, approverName, requestId, documentCount` | `INUMA — {n} Document(s) Auto-Approved: …` |

**Forwarding & support**

| Method | Signature | Subject |
|---|---|---|
| `sendForwardedRequestNotification` | `toEmail, toName, forwardedByName, documentTypeName, requesterName, requestId, note?` | `INUMA — Request forwarded to you: …` |
| `sendForwardReminderNotification` | `toEmail, toName, forwardedByName, documentTypeName, missionOrderNumber, requestId, hoursWaiting` | `INUMA — Reminder: Forwarded request awaiting your review …` |
| `sendSupportAccessRequestNotification` | `toEmail, toName, adminName, requestId` | `INUMA — Support access approval required …` |

**Broadcast**

| Method | Signature | Subject |
|---|---|---|
| `sendAnnouncementEmail` | `toEmail, toName, subject, body, template = 'announcement'` | `INUMA — {subject}` |

`template` is one of `information` \| `warning` \| `announcement` \| `general`, each mapping to an
accent colour, an eyebrow label, a tinted panel and a closing line.

**Health check**

`verifyConnection(): Promise<boolean>` — wraps `verifyMailer()`, returns false instead of throwing.
Exposed as `npm run verify:email` via [src/scripts/verify-email.ts](src/scripts/verify-email.ts),
which prints `{ ok, provider, host, from, fromName }` and exits 0/1/2.

---

## 5. How services consume it

Three instantiation patterns coexist; pick one and stay consistent in a new system.

```ts
// per-instance field  — request.service.ts uses a static, auth/user/query services use instance fields
private emailService = new EmailService();
private static emailService = new EmailService();

// module-level singleton — announcement.service.ts
const emailService = new EmailService();
```

`EmailService` is stateless and the transporter is a module singleton, so all three share one SMTP
pool. Instantiation cost is zero.

### The non-fatal pattern

The rule everywhere: **a failed email must never fail the business operation.**

```ts
// src/services/request.service.ts — submitDraftRequest
try {
  const firstStep = await RequestStepModel.findOne({ … }).populate('approver_id', 'name email');
  if (firstStep?.approver_id) {
    const approver = firstStep.approver_id as any;
    const documentType = await DocumentTypeModel.findById(request.document_type_id);
    const requester = await UserModel.findById(userId);
    if (approver.email && documentType && requester) {
      await this.emailService.sendRequestSubmittedNotification(
        approver.email, approver.name, documentType.name,
        requester.name, requestId.toString()
      );
    }
  }
} catch (error) {
  console.error('Failed to send email notification:', error);
}
```

Note what the `try` block encloses: the recipient lookups *and* the send. A missing approver or a
deleted document type is as non-fatal as a dead relay.

### Email pairs with in-app notification

Where both exist, the in-app notification is authoritative and the email is best-effort — see
[src/utils/forward-reminder.util.ts:54-70](src/utils/forward-reminder.util.ts#L54-L70), where the
email is wrapped in its own inner `try` so a send failure still leaves the in-app notification firing.
Carry this ordering over: **persist the notification first, then attempt the email.**

### Consumer map

| Service | Notifications sent |
|---|---|
| `auth.service.ts` | password reset, login code, support-access request |
| `user.service.ts` | account setup invitation, activation/deactivation, admin password reset |
| `invitation.service.ts` | invitation, bulk resend |
| `request.service.ts` | submitted, approved, rejected, step progression |
| `document.service.ts` | query, rejection, attachment approval, auto-approval, submitted |
| `query-request.service.ts` | query created, query resolved |
| `report.service.ts` | report submitted |
| `request-forward.service.ts` | request forwarded |
| `announcement.service.ts` | bulk announcements |
| `forward-reminder.util.ts` | 12-hourly forward reminders |

---

## 6. Bulk sending — the announcement pipeline

[src/services/announcement.service.ts](src/services/announcement.service.ts) is the reference
implementation for sending to thousands of recipients over a shared relay. Reuse its shape.

```ts
const SEND_CONCURRENCY       = Number(process.env.ANNOUNCEMENT_SEND_CONCURRENCY ?? 3);
const RECIPIENT_INSERT_CHUNK = 1000;  // rows per insert at creation time
const DISPATCH_BATCH_SIZE    = 200;   // recipients loaded per dispatch batch
const MAX_ATTEMPTS           = 3;     // attempts before giving up on a transient failure
const BATCH_PAUSE_MS         = 250;   // polite pause between batches
```

The mechanics:

1. **Recipient rows are materialised up front**, chunked at 1000 inserts, each with a
   `status` (`pending` / `sent` / `failed`) and an `attempts` counter.
2. **Dispatch pulls 200 pending rows at a time**, sends `SEND_CONCURRENCY` at once, pauses 250ms,
   repeats. Memory stays flat regardless of audience size.
3. **Outcomes are written per batch**, one bulk write plus one counter update — not two writes per
   recipient.
4. **Failure classification** decides retry:

```ts
// A 5xx reply is the relay refusing outright (bad address, relaying denied), so
// retrying only wastes attempts. 4xx and socket errors are worth another go.
const isPermanentFailure = (message: string): boolean => /\b5\d{2}\b/.test(message);

const giveUp = isPermanentFailure(message) || attempts >= MAX_ATTEMPTS;
status = giveUp ? 'failed' : 'pending';   // 'pending' → next batch picks it up
```

5. **In-flight guard** (`inFlight` set keyed by announcement id) stops a re-triggered dispatch from
   double-sending.

`SEND_CONCURRENCY` above the transporter's `maxConnections` (3) buys nothing — extra sends just queue
in memory. Raise both together, and only as far as your relay tolerates.

---

## 7. Scheduled email

Forward reminders run on a plain `setInterval`, no job queue:

```ts
// src/utils/forward-reminder.util.ts
const REMINDER_INTERVAL_MS = 12 * 60 * 60 * 1000;

export function scheduleForwardReminders(): void {
  sendForwardReminders();                              // catch already-overdue items on boot
  setInterval(sendForwardReminders, REMINDER_INTERVAL_MS);
}
```

Wired from [src/index.ts:17](src/index.ts#L17). Simple and dependency-free, with the usual caveats:
it does not survive a restart mid-run, and **it fires once per process** — behind more than one app
instance you get duplicate reminders. If you run multiple replicas, move this to a real scheduler or
add a database lock.

---

## 8. Porting checklist

**Copy directly** (product-agnostic):

- `src/utils/ur-mailer.ts` — rename to `mailer.ts`, rename `UR_*` env keys to your prefix.
- The template helpers from the top of `email.service.ts`: `baseTemplate`, `actionLink`,
  `escapeHtml`, `toParagraphs`, the colour constants.
- The announcement batching pipeline, if you need bulk send.

**Adapt:**

1. **Branding** — `LOGO_URL`, `BRAND_COLOR`, the wordmark and tagline in `baseTemplate`, the footer
   text, the `INUMA — ` subject prefix. The logo is an absolute HTTPS URL, not an attachment or a
   data URI; keep it that way and make sure it is publicly reachable without auth, since mail clients
   fetch it anonymously.
2. **Link paths** — `/login`, `/register?token=`, `/reset-password?token=`, `/request/{id}`,
   `/dashboard` are all INUMA routes hardcoded in the methods.
3. **Method set** — keep the ones matching your domain events; the naming convention
   `send{Event}Notification` is worth preserving.
4. **Transport** — if your relay needs credentials, add `auth: { user, pass }` and set
   `port: 587, secure: false` (STARTTLS) or `port: 465, secure: true` (implicit TLS). Then reinstate
   `rejectUnauthorized: true` if the cert is valid. If moving to an API provider (Resend, SES,
   SendGrid), replace `ur-mailer.ts` wholesale — as long as the new module exports the same
   `sendEmail` / `verifyMailer` / `closeMailer` shape, nothing above it changes.

**Deployment must-dos:**

- Set `FRONTEND_URL` to the real origin. Left at the localhost default, every email ships with dead
  links — and the failure is silent, since nothing validates it.
- Confirm the host can reach the relay on port 25 (`nc -zv $SMTP_HOST 25`). Many cloud providers block
  outbound 25 by default.
- Confirm the host's IP is inside the relay's trusted range if you keep the no-auth setup.
- Run the health check after deploy: `npm run verify:email`.
- Set SPF/DKIM for the From domain, or expect spam-folder delivery.

**Don't carry over:**

- The `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASS` / `RESEND_API_KEY`
  block in `.env.example` — commented-out dead config from earlier transports.

---

## 9. Minimal port

The smallest thing that works in a new codebase:

```ts
// mailer.ts
import nodemailer, { type Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const MAIL_FROM = process.env.MAIL_FROM;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;
const DEFAULT_FROM = MAIL_FROM
  ? (MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM)
  : undefined;

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  if (!SMTP_HOST) throw new Error('mailer: set SMTP_HOST');
  transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: 25, secure: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    pool: true, maxConnections: 3, maxMessages: 100,
  });
  return transporter;
}

export const verifyMailer = () => getTransporter().verify();
export const closeMailer  = () => { transporter?.close(); transporter = null; };

export async function sendEmail(o: {
  to: string | string[]; subject: string; html?: string; text?: string; from?: string;
}) {
  const from = o.from || DEFAULT_FROM;
  if (!from) throw new Error("mailer: set MAIL_FROM or pass 'from'");
  if (!o.text && !o.html) throw new Error("sendEmail: provide 'text' or 'html'");
  const info = await getTransporter().sendMail({ ...o, from });
  return { messageId: info.messageId, accepted: info.accepted,
           rejected: info.rejected, response: info.response };
}
```

```bash
# .env
SMTP_HOST=10.20.61.125
MAIL_FROM=noreply@your-domain.rw
MAIL_FROM_NAME="Your System"
FRONTEND_URL=https://your-app.rw
```

```ts
// call site — always non-fatal
try {
  await emailService.sendRequestSubmittedNotification(/* … */);
} catch (error) {
  console.error('Failed to send email notification:', error);
}
```

Dependencies: `nodemailer@^9`, `@types/nodemailer@^8`.
