import nodemailer from 'nodemailer';

/**
 * The whole SMTP surface. Knows nothing about the ledger — it takes an address,
 * a subject and a body, and hands them to the UR relay.
 *
 * The relay on port 25 has no username or password: it accepts mail from
 * trusted internal addresses, so the transporter authenticates by where it is
 * rather than by what it knows. On a host outside that range every send fails
 * with a 5xx, which is the first thing to check when nothing arrives.
 */

/**
 * Built in as defaults so production works without anyone setting environment
 * variables. These are not secrets: the relay has no username or password (it
 * trusts internal addresses), the host is an internal RFC-1918 address that is
 * useless from outside UR, and the From is a public mailbox. Anything set in
 * the environment still wins, so a different deployment can override them
 * without touching code.
 */
const DEFAULTS = {
  host: '10.20.61.125',
  from: 'urbinaryhub@ur.ac.rw',
  fromName: 'UR Binary Hub',
};

const SMTP_HOST = process.env.UR_SMTP_HOST || DEFAULTS.host;
const MAIL_FROM = process.env.UR_MAIL_FROM || DEFAULTS.from;
const MAIL_FROM_NAME = process.env.UR_MAIL_FROM_NAME || DEFAULTS.fromName;
// The UR relay listens on 25. Overridable because a relay that needs STARTTLS
// or a local capture server does not.
const SMTP_PORT = Number(process.env.UR_SMTP_PORT) || 25;

const DEFAULT_FROM = MAIL_FROM
  ? MAIL_FROM_NAME
    ? `${MAIL_FROM_NAME.replace(/^"|"$/g, '')} <${MAIL_FROM}>`
    : MAIL_FROM
  : undefined;

/** Email is optional: with no relay configured the app runs and simply stays quiet. */
export const mailerConfigured = Boolean(SMTP_HOST && MAIL_FROM);

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST) throw new Error('mailer: UR_SMTP_HOST is not set.');

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    // The relay presents a self-signed certificate on 25. Without this every
    // send fails TLS verification.
    tls: { rejectUnauthorized: false },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    // Shared relays throttle aggressive senders; these caps are politeness.
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, text, cc, bcc, replyTo, from }) {
  const sender = from || DEFAULT_FROM;
  if (!sender) throw new Error('mailer: UR_MAIL_FROM is not set.');
  if (!text && !html) throw new Error('mailer: provide text or html.');

  const info = await getTransporter().sendMail({
    from: sender,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    text,
    html,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

/** SMTP handshake check. Throws on failure — used by `npm run verify:email`. */
export const verifyMailer = () => getTransporter().verify();

export function closeMailer() {
  transporter?.close();
  transporter = null;
}

export const mailerSettings = () => ({
  host: SMTP_HOST ?? null,
  port: SMTP_PORT,
  from: MAIL_FROM ?? null,
  fromName: MAIL_FROM_NAME ?? null,
  configured: mailerConfigured,
});
