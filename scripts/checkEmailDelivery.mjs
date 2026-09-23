/* Why did an email not arrive?
 *
 *   node scripts/checkEmailDelivery.mjs --project <ref> --email someone@example.org
 *   node scripts/checkEmailDelivery.mjs --project <ref> --email ... --send
 *   node scripts/checkEmailDelivery.mjs --project <ref> --email ... --probe
 *
 * This exists because the answer is never visible from the application. Supabase
 * answers a password-reset request with 200 whether or not it sent anything - it
 * deliberately hides whether the address exists - so "a reset link is on its way"
 * is not evidence that one is. Every layer that can swallow the message is checked
 * here instead of guessed at:
 *
 *   the account      does it exist, is it usable, was a link recently issued
 *   the redirect     an un-allowlisted redirect_to is refused by Auth
 *   the template     a recovery body with no {{ .ConfirmationURL }} sends a dead end
 *   the limits       a per-address cooldown and an hourly cap, which differ
 *   the relay        --probe sends directly, proving the mail path independently
 *
 * --send triggers a real recovery email and times it. A handoff to a remote SMTP
 * server takes roughly a second; an instant answer means nothing was sent.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireToken } from './lib/env.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const require = createRequire(import.meta.url);

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const project = arg('--project');
const email = (arg('--email') || '').trim().toLowerCase();
const doSend = process.argv.includes('--send');
const doProbe = process.argv.includes('--probe');

if (!email) {
  console.error('Pass --email <address>. Add --project <ref> to read the live configuration,');
  console.error('--send to trigger a real reset email, and --probe to test the relay directly.');
  process.exit(1);
}

const findings = [];
const note = (level, text) => { findings.push({ level, text }); console.log(`  ${level.padEnd(7)} ${text}`); };

/* The browser key lives in supabase-config.js rather than .env, because it is not
   a secret and the static pages need it. */
const browserConfig = await readFile(join(ROOT, 'supabase-config.js'), 'utf8');
const SUPABASE_URL = (browserConfig.match(/CAMPGRIDS_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
const ANON_KEY = (browserConfig.match(/CAMPGRIDS_SUPABASE_ANON_KEY\s*=\s*'([^']+)'/) || [])[1];

let env = {};
try {
  env = Object.fromEntries(
    (await readFile(join(ROOT, '.env'), 'utf8'))
      .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const a = l.indexOf('='); return [l.slice(0, a).trim(), l.slice(a + 1).trim()]; })
  );
} catch { /* .env is optional for the read-only checks */ }

console.log(`Checking delivery to ${email}\n`);

// ---------------------------------------------------------------- config ----
let cfg = null;
if (project) {
  const token = await requireToken('SUPABASE_ACCESS_TOKEN');
  const query = async (sql) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });
    if (!r.ok) throw new Error((await r.text()).slice(0, 200));
    try { return await r.json(); } catch { return []; }
  };

  cfg = await (await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json();

  console.log('the account');
  const rows = await query(`
    select u.email,
           (u.encrypted_password is not null and u.encrypted_password <> '') as has_password,
           u.email_confirmed_at is not null as confirmed,
           u.banned_until, u.deleted_at, u.recovery_sent_at, u.invited_at,
           p.role, p.is_active, p.must_change_password
    from auth.users u left join public.profiles p on p.id = u.id
    where lower(u.email) = '${email.replace(/'/g, "''")}';`);
  const account = rows[0];

  if (!account) {
    note('BLOCKS', 'no account uses this address, so Auth silently sends nothing at all');
  } else {
    note('ok', `role ${account.role ?? '(no profile)'}, active ${account.is_active}, confirmed ${account.confirmed}`);
    if (account.deleted_at) note('BLOCKS', `the account is deleted (${account.deleted_at})`);
    if (account.banned_until && new Date(account.banned_until) > new Date()) {
      note('BLOCKS', `banned until ${account.banned_until}`);
    }
    if (!account.has_password) {
      note('note', 'no password is set, so this address needs a set-password link rather than a reset');
    }
    if (account.recovery_sent_at) {
      const ago = Math.round((Date.now() - new Date(account.recovery_sent_at)) / 1000);
      note(ago < 60 ? 'BLOCKS' : 'ok',
        `a link was last issued ${ago}s ago${ago < 60 ? ' — inside the per-address cooldown, so another request is refused' : ''}`);
    } else {
      note('note', 'Auth has never recorded a reset link for this address');
    }
  }

  console.log('\nwhere a link may land');
  const allow = String(cfg.uri_allow_list || '').split(',').map((s) => s.trim()).filter(Boolean);
  const covered = (target) => allow.some((a) =>
    a === target || (a.includes('*') && target.startsWith(a.split('*')[0])));
  for (const page of ['reset-password.html', 'account-setup.html']) {
    const target = `${String(cfg.site_url || '').replace(/\/$/, '')}/${page}`;
    note(covered(target) ? 'ok' : 'BLOCKS',
      `${target} ${covered(target) ? 'is allowlisted' : 'is NOT allowlisted — Auth refuses the redirect'}`);
  }

  console.log('\nthe message');
  for (const [label, subject, body, needs] of [
    ['recovery', cfg.mailer_subjects_recovery, cfg.mailer_templates_recovery_content, '{{ .ConfirmationURL }}'],
    ['invite', cfg.mailer_subjects_invite, cfg.mailer_templates_invite_content, '{{ .ConfirmationURL }}'],
    ['magic link', cfg.mailer_subjects_magic_link, cfg.mailer_templates_magic_link_content, '{{ .Token }}']
  ]) {
    const text = body || '';
    if (!text) { note('BLOCKS', `the ${label} template is empty, so Supabase sends its own default`); continue; }
    note(text.includes(needs) ? 'ok' : 'BLOCKS',
      `${label}: "${subject}" (${text.length} bytes)${text.includes(needs) ? '' : ` — missing ${needs}`}`);
  }

  console.log('\nsending limits');
  if (!cfg.smtp_host) {
    note('BLOCKS', 'no custom SMTP: the built-in sender only delivers to project members');
  } else {
    note('ok', `${cfg.smtp_host}:${cfg.smtp_port} as ${cfg.smtp_sender_name} <${cfg.smtp_admin_email}>`);
  }
  note(Number(cfg.rate_limit_email_sent) >= 50 ? 'ok' : 'note',
    `${cfg.rate_limit_email_sent} emails per hour across the whole project`);
  note('note', 'a single address may request a reset only once per 60 seconds');
}

// ------------------------------------------------------------------ send ----
if (doSend) {
  console.log('\ntriggering a real reset email');
  if (!SUPABASE_URL || !ANON_KEY) {
    note('BLOCKS', 'supabase-config.js has no project URL or anon key');
  } else {
    const url = new URL(`${SUPABASE_URL}/auth/v1/recover`);
    const redirect = `${String(cfg?.site_url || '').replace(/\/$/, '')}/reset-password.html`;
    if (cfg?.site_url) url.searchParams.set('redirect_to', redirect);
    const started = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const text = await response.text();
    const ms = Date.now() - started;
    if (response.ok) {
      note(ms > 800 ? 'ok' : 'note',
        `Auth accepted it in ${ms}ms — ${ms > 800 ? 'long enough that a message was handed to the relay' : 'fast enough that it may not have sent'}`);
    } else {
      let reason = text.slice(0, 160);
      try { reason = JSON.parse(text).msg || JSON.parse(text).message || reason; } catch { /* keep raw */ }
      note('BLOCKS', `Auth refused it (${response.status}): ${reason}`);
    }
  }
}

// ----------------------------------------------------------------- probe ----
if (doProbe) {
  console.log('\ntesting the relay directly');
  let nodemailer = null;
  try { nodemailer = require('nodemailer'); } catch { note('note', 'nodemailer is not installed; run npm i nodemailer'); }
  const password = String(env.GMAIL_SMTP_APP_PASSWORD || '').replace(/\s+/g, '');
  if (nodemailer && env.GMAIL_SMTP_HOST && password) {
    const transport = nodemailer.createTransport({
      host: env.GMAIL_SMTP_HOST,
      port: Number(env.GMAIL_SMTP_PORT),
      secure: Number(env.GMAIL_SMTP_PORT) === 465,
      auth: { user: env.GMAIL_SMTP_USER, pass: password }
    });
    try {
      await transport.verify();
      note('ok', `${env.GMAIL_SMTP_HOST} accepted the credentials`);
      const started = Date.now();
      const info = await transport.sendMail({
        from: `"${env.GMAIL_SMTP_FROM_NAME || 'MSI CampGrids'}" <${env.GMAIL_SMTP_FROM || env.GMAIL_SMTP_USER}>`,
        to: email,
        subject: 'CampGrids delivery probe',
        text: 'This message exists only to prove the mail path can reach this address. No action is needed.'
      });
      note(info.rejected?.length ? 'BLOCKS' : 'ok',
        `direct send in ${Date.now() - started}ms: ${String(info.response || '').trim()}`);
      if (info.rejected?.length) note('BLOCKS', `the relay rejected ${info.rejected.join(', ')}`);
    } catch (error) {
      note('BLOCKS', `the relay failed: ${error.message}`);
    }
  } else if (nodemailer) {
    note('note', 'GMAIL_SMTP_* is not set in .env, so the relay cannot be tested from here');
  }
}

// ---------------------------------------------------------------- verdict ----
const blockers = findings.filter((f) => f.level === 'BLOCKS');
console.log('\n' + '-'.repeat(68));
if (blockers.length) {
  console.log(`${blockers.length} thing(s) would stop the email:`);
  blockers.forEach((b) => console.log(`  - ${b.text}`));
  process.exit(1);
}
console.log('Nothing in the configuration would stop the email.');
console.log('');
console.log('If it still has not arrived, the message left Supabase and the delay or');
console.log('loss is at the receiving end. In order of likelihood:');
console.log('  1. Spam, or an organization quarantine the recipient cannot see.');
console.log(`  2. Greylisting. Many mail systems reject a first delivery from an`);
console.log('     unfamiliar sender and accept the retry, which can add many minutes.');
console.log('     This is the usual reason a message arrives late rather than never.');
console.log('  3. The sender is a personal mailbox whose display name claims an');
console.log('     organization it does not belong to, which filters treat as a signal.');
console.log('     A dedicated domain with SPF, DKIM and DMARC is the durable fix.');
console.log('');
console.log(`Tell the recipient to search for the exact sender rather than the subject.`);
if (cfg?.smtp_admin_email) console.log(`  from: ${cfg.smtp_admin_email}`);
