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
import { templates } from '../supabase/email/templates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(HERE, '..', 'supabase', 'email-templates');

/* Each Supabase mail event has its own subject and copy. An invitation is not a
   password reset: single-teacher and CSV provisioning call inviteUserByEmail,
   while an explicit set-password request calls resetPasswordForEmail. */
/* Which built file goes to which Supabase action. The activation and recovery
   entries come from supabase/email/templates.mjs so the mapping lives in one place:
   crossing those two over is precisely what made account creation send "Reset your
   password". `forbids` fails the push if a template carries the other flow's
   placeholder, so the two can never be swapped again unnoticed. */
const MAGIC_LINK = {
  id: 'verification-code',
  supabaseTemplate: 'Magic Link',
  configKeys: { subject: 'mailer_subjects_magic_link', content: 'mailer_templates_magic_link_content' },
  subject: 'Your MSI verification code',
  requires: '{{ .Token }}',
  forbids: '{{ .ConfirmationURL }}'
};
const MAP = [
  ...templates.map((t) => ({
    id: t.id,
    supabaseTemplate: t.supabaseTemplate,
    configKeys: t.configKeys,
    subject: t.subject,
    requires: '{{ .ConfirmationURL }}',
    forbids: '{{ .Token }}'
  })),
  MAGIC_LINK
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
    html = await readFile(join(TEMPLATES, `${entry.id}.html`), 'utf8');
  } catch (error) {
    console.error(`  MISSING  ${entry.id}.html - ${error.message}`);
    console.error('           Run: node scripts/buildEmails.mjs');
    blocked = true;
    continue;
  }

  /* A template missing its own placeholder sends a dead email: an activation with
     no link, or a code message with no code. */
  if (!html.includes(entry.requires)) {
    console.error(`  INVALID  ${entry.id}.html for "${entry.supabaseTemplate}": missing ${entry.requires}`);
    blocked = true;
    continue;
  }
  /* Carrying the other flow's placeholder means the mapping has been crossed over. */
  if (entry.forbids && html.includes(entry.forbids)) {
    console.error(`  INVALID  ${entry.id}.html for "${entry.supabaseTemplate}": must not contain ${entry.forbids}`);
    blocked = true;
    continue;
  }
  const live = html.replace(/<!--[\s\S]*?-->/g, '');
  if (live.includes('placehold.co')) {
    console.warn(`  WARNING  ${entry.id}.html still uses a placeholder image.`);
  }

  payload[entry.configKeys.subject] = entry.subject;
  payload[entry.configKeys.content] = html;
  console.log(`  ready    ${entry.supabaseTemplate.padEnd(16)} <- ${entry.id}.html  (${html.length} bytes)`);
  console.log(`           subject: "${entry.subject}"`);
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
