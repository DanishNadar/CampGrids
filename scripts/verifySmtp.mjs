/* Checks the Gmail SMTP credentials in .env by actually connecting to Gmail.
 *
 *   node scripts/verifySmtp.mjs                    # verify the login only
 *   node scripts/verifySmtp.mjs --to me@example.org  # also send one test message
 *
 * Supabase Auth reports a verification-code request as accepted the moment it queues
 * the message. If the SMTP login then fails, nothing arrives and the browser has
 * already been told everything worked. That gap is why this exists: it tests the
 * credentials directly, so an authentication failure is visible instead of silent.
 *
 * The password is never printed, only its length and shape.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

let fileEnv = {};
try { fileEnv = parseEnv(await readFile(join(HERE, '..', '.env'), 'utf8')); } catch { /* reported below */ }
const value = (name) => process.env[name] || fileEnv[name] || '';

const host = value('GMAIL_SMTP_HOST');
const port = Number(value('GMAIL_SMTP_PORT') || 465);
const user = value('GMAIL_SMTP_USER');
const raw = value('GMAIL_SMTP_APP_PASSWORD');
const from = value('GMAIL_SMTP_FROM') || user;
const fromName = value('GMAIL_SMTP_FROM_NAME') || 'MSI CampGrids';
const to = arg('--to');

if (!host || !user || !raw) {
  console.error('GMAIL_SMTP_HOST, GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD are required in .env.');
  process.exit(1);
}

/* Google shows an app password as four groups of four. Gmail's SMTP server strips
   that whitespace itself, so a stored value containing spaces still authenticates -
   verified against smtp.gmail.com rather than assumed. Both forms are tried anyway,
   because other providers are stricter and the output should say which one works. */
const stripped = raw.replace(/\s+/g, '');
const hasSpaces = stripped !== raw;

console.log(`  host            ${host}:${port}`);
console.log(`  user            ${user}`);
console.log(`  app password    ${raw.length} chars as stored, ${stripped.length} with whitespace removed`);
if (hasSpaces) console.log('                  -> contains spaces; Gmail tolerates these, other providers may not');
if (stripped.length !== 16) console.log(`                  -> a Google app password is 16 characters; this is ${stripped.length}`);

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  console.error('\nnodemailer is not installed. Run: npm install nodemailer');
  process.exit(1);
}

async function attempt(label, password) {
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,          // 465 is implicit TLS; 587 upgrades with STARTTLS
    auth: { user, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000
  });
  try {
    await transport.verify();
    console.log(`  ${label.padEnd(26)} AUTH OK`);
    return transport;
  } catch (error) {
    // Gmail's rejection text is safe to show and names the actual reason.
    const detail = String(error?.response || error?.message || error).split('\n')[0];
    console.log(`  ${label.padEnd(26)} FAILED  ${detail}`);
    return null;
  } finally {
    if (!transport.__keep) transport.close?.();
  }
}

console.log('\n--- authenticating ---');
let working = null;
let workingPassword = '';

if (hasSpaces) {
  // Test both so the output proves which form Gmail accepts.
  if (await attempt('as stored (with spaces)', raw)) { working = true; workingPassword = raw; }
  if (!working && await attempt('with spaces removed', stripped)) { working = true; workingPassword = stripped; }
} else if (await attempt('as stored', raw)) { working = true; workingPassword = raw; }

if (!working) {
  console.error('\nGmail rejected the credentials. Regenerate the app password at');
  console.error('https://myaccount.google.com/apppasswords and store the 16 characters with');
  console.error('no spaces, then re-run: npm run configure:smtp -- --project <ref>');
  process.exit(1);
}

if (hasSpaces && workingPassword === stripped) {
  console.log('\n  The stored value works only once the spaces are removed. Fix .env:');
  console.log(`  GMAIL_SMTP_APP_PASSWORD=${'*'.repeat(16)}   (16 characters, no spaces)`);
  console.log('  then re-run: npm run configure:smtp -- --project <ref>');
}

if (!to) {
  console.log('\nLogin verified. Pass --to <address> to send one real test message.');
  process.exit(0);
}

console.log('\n--- sending a test message ---');
const transport = nodemailer.createTransport({
  host, port, secure: port === 465, auth: { user, pass: workingPassword }
});
try {
  const info = await transport.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: 'MSI CampGrids SMTP test',
    text: 'This message confirms the CampGrids SMTP credentials can deliver mail. No action is needed.'
  });
  console.log(`  accepted for: ${(info.accepted || []).join(', ') || '(none)'}`);
  if ((info.rejected || []).length) console.log(`  rejected:     ${info.rejected.join(', ')}`);
  console.log(`  server said:  ${String(info.response || '').split('\n')[0]}`);
  console.log('\nIf that arrives, the credentials are good and any missing Supabase email is a');
  console.log('Supabase-side problem: check that custom SMTP is applied to the project and that');
  console.log('the hourly email limit has not been reached.');
} catch (error) {
  console.error(`  send failed: ${String(error?.response || error?.message || error).split('\n')[0]}`);
  process.exit(1);
} finally {
  transport.close?.();
}
