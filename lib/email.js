import User from '@/models/User';
import { CLOSER_ROLES, ROLE_LABELS, ROLE_OF_STAGE } from '@/lib/enums';
import { mailerConfigured, sendEmail } from '@/lib/mailer';
import { appUrl } from '@/lib/app-url';

/**
 * One function per thing that happens. Callers use `notify()`, which never
 * throws and never blocks the request — a dead relay must not stop an entry
 * being recorded or an approval going through.
 */

const CURRENCY = process.env.CURRENCY || 'RWF';
const SUBJECT_PREFIX = 'UR Binary Hub Finance';

const BRAND = '#123c7a';
const GREEN = '#0f7a54';
const RED = '#c0392b';
const AMBER = '#a35a07';

const money = (value) =>
  `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.abs((Number(value) ?? 0) % 1) < 0.005 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value) ?? 0)} ${CURRENCY}`;

const day = (value) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value instanceof Date ? value : new Date(value));

/**
 * Everything a person can put in an entry reaches these templates, so it is all
 * escaped. The rule is simpler to keep than a list of which fields are safe.
 */
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/* ------------------------------------------------------------- templates */

function baseTemplate(bodyHtml, accent = BRAND) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f7fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4eaf3;border-radius:10px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
  <tr><td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:22px 28px 10px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:10px;"><img src="${appUrl()}/brand/logo.png" width="34" height="34" alt="" style="display:block;border:0;" /></td>
      <td style="font:700 16px Helvetica,Arial,sans-serif;color:#0f1a2b;letter-spacing:-0.2px;">UR Binary Hub<br />
        <span style="font:400 11px Helvetica,Arial,sans-serif;color:#5b6b82;">Finance · ${CURRENCY}</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:6px 28px 24px;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#44536b;">${bodyHtml}</td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #e4eaf3;font:400 11px/1.5 Helvetica,Arial,sans-serif;color:#5b6b82;">
    You are receiving this because you hold an account in the hub&rsquo;s finance system.<br />
    This message may contain financial information intended only for you.<br />
    &copy; ${new Date().getFullYear()} UR Binary Hub
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Table-wrapped so Outlook renders it; no <button>, no flexbox. */
const actionLink = (path, label, color = BRAND) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;"><tr>
<td style="background:${color};border-radius:6px;">
<a href="${appUrl()}${path}" style="display:inline-block;padding:10px 18px;font:600 13px Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;

const heading = (text) =>
  `<p style="margin:0 0 12px;font:700 18px Helvetica,Arial,sans-serif;color:#0f1a2b;letter-spacing:-0.3px;">${esc(text)}</p>`;

/** The entry's own details, as a small table. rows: [label, value][] */
const factTable = (rows) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0;border-collapse:collapse;width:100%;">
${rows
  .filter(([, value]) => value !== null && value !== undefined && value !== '')
  .map(
    ([label, value]) => `<tr>
<td style="padding:6px 12px 6px 0;font:400 11px Helvetica,Arial,sans-serif;color:#5b6b82;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
<td style="padding:6px 0;font:400 13px Helvetica,Arial,sans-serif;color:#0f1a2b;">${esc(value)}</td></tr>`,
  )
  .join('')}
</table>`;

const quote = (text) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0;"><tr>
<td style="border-left:3px solid #cbd6e6;padding:2px 0 2px 12px;font:400 13px/1.55 Helvetica,Arial,sans-serif;color:#44536b;">${esc(text)}</td></tr></table>`;

const plain = (lines) => lines.filter(Boolean).join('\n');

/* -------------------------------------------------------------- recipients */

/** Active people holding any of these role keys, minus whoever caused the event. */
async function peopleWithRoles(roles, exceptId) {
  const people = await User.find({ role: { $in: roles }, active: true })
    .select('name email role')
    .lean();
  return people.filter((person) => String(person._id) !== String(exceptId ?? ''));
}

/** Who handles a new or resubmitted entry: the first approver, and the administrator. */
const reviewers = (exceptId) => peopleWithRoles(['approver1', 'admin'], exceptId);

/** Who closes and reopens months. */
const closers = (exceptId) => peopleWithRoles(CLOSER_ROLES, exceptId);

/* ------------------------------------------------------------------ send */

/**
 * Fire-and-forget. Never throws, never awaited by a route handler: a relay that
 * hangs for ten seconds must not hold up an approval.
 *
 * On a long-running server (the Docker deployment) the send finishes after the
 * response. On a platform that freezes the process the moment a response is
 * returned, these would be cut short — see the note in the README.
 */
export function notify(task) {
  if (!mailerConfigured) return;
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error('[email] notification failed:', error?.message ?? error);
    });
}

async function deliver({ to, subject, html, text, accent }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter((person) => person?.email);
  if (!recipients.length) return;

  await Promise.all(
    recipients.map((person) =>
      sendEmail({
        to: person.email,
        subject: `${SUBJECT_PREFIX} — ${subject}`,
        html: baseTemplate(html(person), accent),
        text: text(person),
      }).then((info) => {
        if (info.rejected?.length) {
          throw new Error(`rejected for ${info.rejected.join(', ')}`);
        }
      }),
    ),
  );
}

/* ------------------------------------------------------------- the ledger */

const entryFacts = (entry, category) => [
  ['Date', day(entry.date)],
  ['Amount', `${entry.type === 'in' ? 'Money in' : 'Money out'} · ${money(entry.amount)}`],
  ['Budget line', category?.name ?? '—'],
  ['Reference', entry.reference || null],
];

/** A new entry is waiting. Goes to everyone who can clear it. */
export async function entryRecorded({ entry, category, recordedBy, count = 1 }) {
  const to = await reviewers(recordedBy.id);
  const many = count > 1;
  const subject = many
    ? `${count} entries waiting for review`
    : `New entry waiting: ${entry.description}`;

  await deliver({
    to,
    subject,
    accent: BRAND,
    html: (person) => `
${heading(many ? `${count} entries are waiting for review` : 'An entry is waiting for review')}
<p style="margin:0 0 4px;">Hello ${esc(person.name.split(' ')[0])},</p>
<p style="margin:0;">${esc(recordedBy.name)} recorded ${many ? `${count} entries` : 'an entry'} in the cashbook. ${many ? 'None of them count' : 'It does not count'} towards the balance until reviewed.</p>
${many ? '' : factTable([['Entry', entry.description], ...entryFacts(entry, category)])}
${actionLink('/approvals', many ? 'Open the approvals queue' : 'Review this entry')}`,
    text: (person) =>
      plain([
        `Hello ${person.name.split(' ')[0]},`,
        '',
        `${recordedBy.name} recorded ${many ? `${count} entries` : 'an entry'} in the cashbook.`,
        many ? null : `${entry.description} — ${money(entry.amount)} on ${day(entry.date)}`,
        '',
        `Review: ${appUrl()}/approvals`,
      ]),
  });
}

/** An entry that had already been reviewed was changed, so it is pending again. */
export async function entryReturnedToPending({ entry, category, editedBy, changes }) {
  const to = await reviewers(editedBy.id);
  await deliver({
    to,
    subject: `Re-submitted after edit: ${entry.description}`,
    accent: AMBER,
    html: (person) => `
${heading('An entry needs reviewing again')}
<p style="margin:0 0 4px;">Hello ${esc(person.name.split(' ')[0])},</p>
<p style="margin:0;">${esc(editedBy.name)} changed an entry that had already been reviewed, so the earlier decision no longer applies and it is back in the queue.</p>
${factTable([['Entry', entry.description], ...entryFacts(entry, category), ['Changed', changes || null]])}
${actionLink('/approvals', 'Review it again', AMBER)}`,
    text: (person) =>
      plain([
        `Hello ${person.name.split(' ')[0]},`,
        '',
        `${editedBy.name} changed an already-reviewed entry, so it is back in the queue.`,
        `${entry.description} — ${money(entry.amount)}`,
        changes ? `Changed: ${changes}` : null,
        '',
        `Review: ${appUrl()}/approvals`,
      ]),
  });
}

/** The decision, back to whoever recorded it. */
export async function entryReviewed({ entry, category, recorder, reviewer, decision, reason }) {
  if (!recorder?.email || String(recorder._id ?? recorder.id) === String(reviewer.id)) return;

  const settled = { approved: 'Approved', rejected: 'Returned', void: 'Voided' }[decision];
  const accent = decision === 'approved' ? GREEN : RED;
  const line = {
    approved: 'It counts towards the balance from now on.',
    rejected: 'It does not count. Correct it and it restarts at Approver 1.',
    void: 'It stays in the book, struck through, and counts for nothing.',
  }[decision];

  await deliver({
    to: [recorder],
    subject: `${settled}: ${entry.description}`,
    accent,
    html: () => `
${heading(`Your entry was ${settled.toLowerCase()}`)}
<p style="margin:0 0 4px;">Hello ${esc((recorder.name ?? '').split(' ')[0])},</p>
<p style="margin:0;">${esc(reviewer.name)} reviewed the entry you recorded. ${esc(line)}</p>
${factTable([['Entry', entry.description], ...entryFacts(entry, category)])}
${reason ? `<p style="margin:14px 0 0;font:400 12px Helvetica,Arial,sans-serif;color:#5b6b82;text-transform:uppercase;letter-spacing:0.06em;">Reason</p>${quote(reason)}` : ''}
${actionLink('/ledger', 'Open the ledger', accent)}`,
    text: () =>
      plain([
        `Hello ${(recorder.name ?? '').split(' ')[0]},`,
        '',
        `${reviewer.name} marked your entry ${settled.toLowerCase()}. ${line}`,
        `${entry.description} — ${money(entry.amount)} on ${day(entry.date)}`,
        reason ? `Reason: ${reason}` : null,
        '',
        `Ledger: ${appUrl()}/ledger`,
      ]),
  });
}

/**
 * An entry cleared one stage. The next stage's people are told it is waiting;
 * on the last stage the initiator hears that it now counts.
 */
export async function entryAdvanced({ entry, category, recorder, actor, stage, next, note }) {
  if (next === 'approved') {
    await entryReviewed({ entry, category, recorder, reviewer: actor, decision: 'approved', reason: note });
    return;
  }

  const nextRole = ROLE_OF_STAGE[next];
  const to = await peopleWithRoles([nextRole, 'admin'], actor.id);
  const waitingOn = ROLE_LABELS[nextRole];

  await deliver({
    to,
    subject: `Waiting for ${waitingOn}: ${entry.description}`,
    accent: BRAND,
    html: (person) => `
${heading(`An entry is waiting for ${waitingOn}`)}
<p style="margin:0 0 4px;">Hello ${esc(person.name.split(' ')[0])},</p>
<p style="margin:0;">${esc(actor.name)} cleared the previous step. ${
      next === 'with_accountant'
        ? `Confirm that the money was ${entry.type === 'in' ? 'received' : 'paid out'}.`
        : 'Give the final approval so it counts towards the balance.'
    }</p>
${factTable([['Entry', entry.description], ...entryFacts(entry, category)])}
${note ? quote(note) : ''}
${actionLink('/approvals', 'Open the queue')}`,
    text: (person) =>
      plain([
        `Hello ${person.name.split(' ')[0]},`,
        '',
        `${entry.description} — ${money(entry.amount)} is waiting for ${waitingOn}.`,
        note ? `Note: ${note}` : null,
        '',
        `Queue: ${appUrl()}/approvals`,
      ]),
  });
}

/** Someone left a remark; tell the people already involved with that entry. */
export async function entryCommented({ entry, category, author, body, involved }) {
  const to = involved.filter(
    (person) => person?.email && String(person._id ?? person.id) !== String(author.id),
  );

  await deliver({
    to,
    subject: `Comment on: ${entry.description}`,
    accent: AMBER,
    html: (person) => `
${heading('A comment was left on an entry')}
<p style="margin:0 0 4px;">Hello ${esc(person.name.split(' ')[0])},</p>
<p style="margin:0;">${esc(author.name)} (${esc(ROLE_LABELS[author.role] ?? author.role)}) commented on an entry you are involved with.</p>
${factTable([['Entry', entry.description], ...entryFacts(entry, category)])}
${quote(body)}
${actionLink('/ledger', 'Open the ledger', AMBER)}`,
    text: (person) =>
      plain([
        `Hello ${person.name.split(' ')[0]},`,
        '',
        `${author.name} commented on "${entry.description}":`,
        body,
        '',
        `Ledger: ${appUrl()}/ledger`,
      ]),
  });
}

/* ------------------------------------------------------------------ months */

export async function periodChanged({ year, month, action, actor, closingBalance, variance }) {
  const to = await closers(actor.id);
  const label = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const closed = action === 'close';

  await deliver({
    to,
    subject: closed ? `${label} is closed` : `${label} has been reopened`,
    accent: closed ? GREEN : AMBER,
    html: (person) => `
${heading(closed ? `${label} is closed` : `${label} has been reopened`)}
<p style="margin:0 0 4px;">Hello ${esc(person.name.split(' ')[0])},</p>
<p style="margin:0;">${esc(actor.name)} ${closed ? `closed ${label}. Nothing dated inside it can be created, edited, voided or approved.` : `reopened ${label}. Entries dated inside it can be changed again.`}</p>
${closed ? factTable([['Closing balance', money(closingBalance ?? 0)], ['Variance', variance === null || variance === undefined ? null : money(variance)]]) : ''}
${actionLink('/settings', 'Open settings', closed ? GREEN : AMBER)}`,
    text: (person) =>
      plain([
        `Hello ${person.name.split(' ')[0]},`,
        '',
        `${actor.name} ${closed ? `closed ${label}.` : `reopened ${label}.`}`,
        closed ? `Closing balance: ${money(closingBalance ?? 0)}` : null,
        '',
        `Settings: ${appUrl()}/settings`,
      ]),
  });
}

/* ------------------------------------------------------------------ people */

export async function accountCreated({ person, role, createdBy }) {
  await deliver({
    to: [person],
    subject: 'Your finance account is ready',
    accent: BRAND,
    html: () => `
${heading('Your account is ready')}
<p style="margin:0 0 4px;">Hello ${esc((person.name ?? '').split(' ')[0])},</p>
<p style="margin:0;">${esc(createdBy.name)} set up an account for you in the hub&rsquo;s finance system.</p>
${factTable([['Email', person.email], ['Role', ROLE_LABELS[role] ?? role]])}
<p style="margin:12px 0 0;">Your first password was handed to you directly — it is not in this email. Change it under Settings once you are in.</p>
${actionLink('/login', 'Sign in')}`,
    text: () =>
      plain([
        `Hello ${(person.name ?? '').split(' ')[0]},`,
        '',
        `${createdBy.name} set up a finance account for you.`,
        `Role: ${ROLE_LABELS[role] ?? role}`,
        'Your first password was handed to you directly, not sent by email.',
        '',
        `Sign in: ${appUrl()}/login`,
      ]),
  });
}

export async function accountChanged({ person, change, detail, actor }) {
  const accent = change === 'deactivated' ? RED : change === 'activated' ? GREEN : AMBER;
  const titles = {
    activated: 'Your account has been restored',
    deactivated: 'Your account has been deactivated',
    role: 'Your role has changed',
    password: 'Your password was reset',
  };
  const lines = {
    activated: 'You can sign in again.',
    deactivated: 'You can no longer sign in. Everything you recorded stays in the book.',
    role: `Your role is now ${detail}.`,
    password: `${actor.name} set a new password for you. Ask them for it, then change it under Settings.`,
  };

  await deliver({
    to: [person],
    subject: titles[change],
    accent,
    html: () => `
${heading(titles[change])}
<p style="margin:0 0 4px;">Hello ${esc((person.name ?? '').split(' ')[0])},</p>
<p style="margin:0;">${esc(lines[change])}</p>
<p style="margin:12px 0 0;font:400 12px Helvetica,Arial,sans-serif;color:#5b6b82;">Changed by ${esc(actor.name)}.</p>
${change === 'deactivated' ? '' : actionLink('/login', 'Sign in', accent)}`,
    text: () =>
      plain([
        `Hello ${(person.name ?? '').split(' ')[0]},`,
        '',
        lines[change],
        `Changed by ${actor.name}.`,
        change === 'deactivated' ? null : `Sign in: ${appUrl()}/login`,
      ]),
  });
}

/** Security confirmation, sent to the person who changed their own password. */
export async function passwordChanged({ person }) {
  await deliver({
    to: [person],
    subject: 'Your password was changed',
    accent: AMBER,
    html: () => `
${heading('Your password was changed')}
<p style="margin:0 0 4px;">Hello ${esc((person.name ?? '').split(' ')[0])},</p>
<p style="margin:0;">The password on your finance account was just changed. If that was you, nothing more to do.</p>
<p style="margin:12px 0 0;">If it was not, tell an administrator straight away.</p>`,
    text: () =>
      plain([
        `Hello ${(person.name ?? '').split(' ')[0]},`,
        '',
        'The password on your finance account was just changed.',
        'If that was not you, tell an administrator straight away.',
      ]),
  });
}
