/* Reports the email-related settings actually live on a Supabase project, so a
   "no email arrived" problem can be narrowed down instead of guessed at.

   Usage (PowerShell):
     $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
     node scripts/checkEmailSetup.mjs --project hofninqlkcuzgboslodq

   Read-only: it performs a GET and changes nothing. The token is read from the
   environment and never logged. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(HERE, '..', 'supabase', 'email-templates');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const project = arg('--project');
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!project) { console.error('Pass --project <project-ref>.'); process.exit(1); }
if (!token) { console.error('Set SUPABASE_ACCESS_TOKEN first.'); process.exit(1); }

const response = await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` }
});
if (!response.ok) {
  console.error(`Failed: ${response.status} ${response.statusText}\n${(await response.text()).slice(0, 400)}`);
  process.exit(1);
}
const cfg = await response.json();

const yes = (v) => (v ? 'yes' : 'NO');
const show = (label, value) => console.log(`  ${label.padEnd(34)} ${value === undefined || value === null || value === '' ? '(not set)' : value}`);

console.log('\n=== SMTP: who actually sends the mail ===');
show('custom SMTP host', cfg.smtp_host);
show('port', cfg.smtp_port);
show('username', cfg.smtp_user);
show('sender address', cfg.smtp_admin_email);
show('sender name', cfg.smtp_sender_name);
if (!cfg.smtp_host) {
  console.log('\n  Custom SMTP is OFF. Supabase then uses its own shared sender, which is');
  console.log('  limited to a handful of messages per hour and is often dropped outright.');
  console.log('  That alone explains mail that stops arriving.');
}

console.log('\n=== Rate limits ===');
show('emails allowed per hour', cfg.rate_limit_email_sent);
console.log('  Every message counts: set-password links, verification codes, and each');
console.log('  row of a CSV import. Exceeding it makes further sends fail for the rest');
console.log('  of the hour.');

console.log('\n=== Redirects: where a link is allowed to land ===');
show('Site URL', cfg.site_url);
const allow = String(cfg.uri_allow_list || '');
show('redirect allowlist', allow || '(empty)');
const entries = allow.split(',').map((s) => s.trim()).filter(Boolean);
const coversSettings = entries.some((e) => /settings\.html/.test(e) || e.endsWith('/**') || e.endsWith('/*'));
console.log(`  covers settings.html:              ${yes(coversSettings)}`);
if (!coversSettings) {
  console.log('  A redirect_to that is not on this list is rejected, and depending on the');
  console.log('  Auth version that either refuses the send or silently rewrites the link.');
  console.log('  Add the exact settings.html URL for every origin you serve from.');
}

console.log('\n=== Templates: did the push take? ===');
const live = {
  'Reset Password': { subject: cfg.mailer_subjects_recovery, content: cfg.mailer_templates_recovery_content, file: 'set-password.html' },
  'Invite user': { subject: cfg.mailer_subjects_invite, content: cfg.mailer_templates_invite_content, file: 'set-password.html' },
  'Magic Link': { subject: cfg.mailer_subjects_magic_link, content: cfg.mailer_templates_magic_link_content, file: 'verification-code.html' }
};
for (const [name, entry] of Object.entries(live)) {
  let local = '';
  try { local = await readFile(join(TEMPLATES, entry.file), 'utf8'); } catch { /* reported below */ }
  const remote = entry.content || '';
  const branded = remote.includes('#FE5000');
  const matches = local && remote.trim() === local.trim();
  console.log(`  ${name}`);
  console.log(`    subject on project:              ${entry.subject || '(Supabase default)'}`);
  console.log(`    body length on project:          ${remote.length} bytes`);
  console.log(`    MSI orange present:              ${yes(branded)}`);
  console.log(`    identical to ${entry.file.padEnd(22)} ${yes(matches)}`);
  if (remote && !branded) console.log('    -> still the unbranded default; the push has not been applied.');
}

console.log('\n=== Other settings that stop mail ===');
show('email signup enabled', cfg.external_email_enabled);
show('autoconfirm (skips confirm mail)', cfg.mailer_autoconfirm);
show('secure email change', cfg.mailer_secure_email_change_enabled);
show('OTP expiry (seconds)', cfg.mailer_otp_exp);

console.log('\nIf everything above looks right and mail still does not arrive, the failure is');
console.log('at the provider. Open Supabase Dashboard -> Logs -> Auth Logs and look for the');
console.log('send; the SMTP error from Gmail is recorded there verbatim.');
