/**
 * SMTP health check: `npm run verify:email`.
 * Exits 0 when the relay answers, 1 when it refuses, 2 when nothing is configured.
 */
import { verifyMailer, mailerSettings, closeMailer } from '../lib/mailer.js';

const settings = mailerSettings();
console.log(JSON.stringify({ provider: 'ur-smtp', ...settings }, null, 2));

if (!settings.configured) {
  console.error('\nEmail is not configured. Set UR_SMTP_HOST and UR_MAIL_FROM.');
  process.exit(2);
}

try {
  await verifyMailer();
  console.log('\nok — the relay answered the handshake.');
  process.exit(0);
} catch (error) {
  console.error(`\nfailed — ${error.message}`);
  console.error('Check that this host can reach the relay on port 25 and that its IP is trusted.');
  process.exit(1);
} finally {
  closeMailer();
}
