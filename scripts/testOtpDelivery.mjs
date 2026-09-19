/* Sends one real Supabase verification-code request to an existing staff account.
 *
 *   node scripts/testOtpDelivery.mjs --to staff@example.org
 *
 * This validates the same Auth OTP dispatch used after a staff password sign-in.
 * It never prints credentials, links, or codes. The request replaces any outstanding
 * OTP for that address, so only run it with the recipient's knowledge.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const recipient = String(arg('--to') || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  console.error('Pass --to <existing-staff-email>.');
  process.exit(1);
}

let fileEnv = {};
try { fileEnv = parseEnv(await readFile(join(HERE, '..', '.env'), 'utf8')); } catch { /* checked below */ }
const url = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !serviceRole) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env or the shell environment.');
  process.exit(1);
}

const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/otp`, {
  method: 'POST',
  headers: {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: recipient, create_user: false }),
});

if (!response.ok) {
  let message = 'Supabase rejected the verification-code request.';
  try {
    const payload = await response.json();
    message = payload?.msg || payload?.error || payload?.message || message;
  } catch { /* retain the safe generic message */ }
  console.error(`OTP dispatch failed (${response.status}): ${message}`);
  process.exit(1);
}

console.log(`Supabase accepted a verification-code request for ${recipient}. Check that inbox, Spam, and quarantine; acceptance does not prove inbox placement.`);
