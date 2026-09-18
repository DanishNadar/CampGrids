/* Pushes the branded email templates in supabase/email-templates/ to a Supabase
   project, so the files in this repository are the source of truth instead of
   something that has to be pasted into the dashboard by hand.

   Usage (PowerShell):
     $env:SUPABASE_ACCESS_TOKEN = "sbp_..."        # personal access token
     node scripts/pushEmailTemplates.mjs --project hofninqlkcuzgboslodq --dry-run
     node scripts/pushEmailTemplates.mjs --project hofninqlkcuzgboslodq

   Create the token at https://supabase.com/dashboard/account/tokens. It is read
   from the environment and never written to disk or logged.

   Why the Management API rather than `supabase config push`: config push sends the
   whole auth configuration, and anything absent from config.toml reverts to a
   default. That would silently wipe the custom Gmail SMTP settings and the redirect
   URL allowlist. This request is a PATCH of six named fields, so nothing else on the
   project is touched. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(HERE, '..', 'supabase', 'email-templates');

/* Which file and subject belong to which Supabase template. set-password.html is
   used twice on purpose: "Reset Password" is what resetPasswordForEmail sends and
   "Invite user" is what the CSV import sends, and the same wording suits both. */
const MAP = [
  { name: 'Reset Password', file: 'set-password.html', subjectKey: 'mailer_subjects_recovery', contentKey: 'mailer_templates_recovery_content', subject: 'Set your CampGrids password', needs: '{{ .ConfirmationURL }}' },
  { name: 'Invite user', file: 'set-password.html', subjectKey: 'mailer_subjects_invite', contentKey: 'mailer_templates_invite_content', subject: 'Set your CampGrids password', needs: '{{ .ConfirmationURL }}' },
  { name: 'Magic Link', file: 'verification-code.html', subjectKey: 'mailer_subjects_magic_link', contentKey: 'mailer_templates_magic_link_content', subject: 'Your CampGrids verification code', needs: '{{ .Token }}' }
];

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const dryRun = process.argv.includes('--dry-run');
const project = arg('--project');
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!project) {
  console.error('Pass --project <project-ref>. Find it in the Supabase dashboard URL.');
  process.exit(1);
}
if (!token && !dryRun) {
  console.error('Set SUPABASE_ACCESS_TOKEN first. Create one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const payload = {};
let blocked = false;

for (const entry of MAP) {
  let html;
  try {
    html = await readFile(join(TEMPLATES, entry.file), 'utf8');
  } catch (error) {
    console.error(`  MISSING  ${entry.file} — ${error.message}`);
    blocked = true;
    continue;
  }

  /* A template that has lost its placeholder would send a dead email: a set-password
     message with no link, or a code message with no code. Better to refuse than to
     push it. */
  if (!html.includes(entry.needs)) {
    console.error(`  INVALID  ${entry.file} for "${entry.name}": missing ${entry.needs}`);
    blocked = true;
    continue;
  }
  /* The Magic Link template carries the code itself, so a confirmation link in it
     would offer a second, competing way in. */
  if (entry.name === 'Magic Link' && html.includes('{{ .ConfirmationURL }}')) {
    console.error(`  INVALID  ${entry.file} for "Magic Link": remove {{ .ConfirmationURL }}; that template sends the code, not a link.`);
    blocked = true;
    continue;
  }
  /* Only count a placeholder that is actually live. Commented-out markup is not
     sent, so warning about it would train the reader to ignore the warning. */
  const live = html.replace(/<!--[\s\S]*?-->/g, '');
  if (live.includes('placehold.co')) {
    console.warn(`  WARNING  ${entry.file} still points at placehold.co for its logo. Swap it for an MSI-hosted https URL before real sending.`);
  }

  payload[entry.subjectKey] = entry.subject;
  payload[entry.contentKey] = html;
  console.log(`  ready    ${entry.name.padEnd(16)} <- ${entry.file}  (${html.length} bytes, subject "${entry.subject}")`);
}

if (blocked) {
  console.error('\nNothing was pushed. Fix the problems above and run again.');
  process.exit(1);
}

if (dryRun) {
  console.log(`\nDry run. Would PATCH ${Object.keys(payload).length} fields on project ${project}.`);
  process.exit(0);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

if (!response.ok) {
  const body = await response.text();
  console.error(`\nFailed: ${response.status} ${response.statusText}\n${body.slice(0, 600)}`);
  if (response.status === 401 || response.status === 403) {
    console.error('\nA 401 or 403 means the access token is wrong or lacks access to this project.');
  }
  process.exit(1);
}

console.log(`\nPushed. Send yourself one more set-password link to confirm the new design.`);
console.log('The sender avatar is not part of the template — see supabase/README.md.');
