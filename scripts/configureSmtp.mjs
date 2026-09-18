/* Applies the repository's local Gmail SMTP values to Supabase Auth.
 *
 *   node scripts/configureSmtp.mjs --project <ref> --dry-run
 *   node scripts/configureSmtp.mjs --project <ref>
 *
 * Values are read from the shell first, then .env. They are never printed. A
 * custom SMTP service is required for delivery to arbitrary teacher addresses;
 * Supabase's shared sender only delivers to authorized project-team addresses.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(HERE, '..', '.env');

function arg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
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

const project = arg('--project');
const dryRun = process.argv.includes('--dry-run');
if (!project) { console.error('Pass --project <project-ref>.'); process.exit(1); }
if (!process.env.SUPABASE_ACCESS_TOKEN && !dryRun) {
  console.error('Set SUPABASE_ACCESS_TOKEN first: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

let fileEnv = {};
try { fileEnv = parseEnv(await readFile(ENV_FILE, 'utf8')); } catch { /* handled by missing-value output */ }
const value = (name) => process.env[name] || fileEnv[name] || '';

const required = [
  'GMAIL_SMTP_HOST',
  'GMAIL_SMTP_PORT',
  'GMAIL_SMTP_USER',
  'GMAIL_SMTP_APP_PASSWORD',
  'GMAIL_SMTP_FROM',
  'GMAIL_SMTP_FROM_NAME',
];
const missing = required.filter((name) => !value(name));
if (missing.length) {
  console.error(`Missing SMTP settings: ${missing.join(', ')}. Add them to .env or the shell environment.`);
  process.exit(1);
}

const port = Number(value('GMAIL_SMTP_PORT'));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('GMAIL_SMTP_PORT must be a valid port number.');
  process.exit(1);
}

const payload = {
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  smtp_admin_email: value('GMAIL_SMTP_FROM'),
  smtp_host: value('GMAIL_SMTP_HOST'),
  smtp_port: port,
  smtp_user: value('GMAIL_SMTP_USER'),
  smtp_pass: value('GMAIL_SMTP_APP_PASSWORD'),
  smtp_sender_name: value('GMAIL_SMTP_FROM_NAME'),
};

console.log('  SMTP host: configured');
console.log('  SMTP port: configured');
console.log('  SMTP credentials: configured');
console.log('  Sender identity: configured');

if (dryRun) {
  console.log(`\nDry run. Would configure custom SMTP on project ${project}.`);
  process.exit(0);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!response.ok) {
  console.error(`Could not configure SMTP: ${response.status} ${response.statusText}\n${(await response.text()).slice(0, 400)}`);
  process.exit(1);
}

console.log('\nCustom SMTP configured. Supabase Auth can now deliver to teacher addresses.');
