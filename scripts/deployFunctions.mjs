/* Deploys the Supabase Edge Functions straight from this repository.
 *
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
 *   node scripts/deployFunctions.mjs --project <ref> --dry-run
 *   node scripts/deployFunctions.mjs --project <ref>
 *   node scripts/deployFunctions.mjs --project <ref> --only provision-teachers
 *
 * Why this exists: `supabase functions deploy` needs the CLI logged in, and on some
 * machines Docker as well. The Management API needs neither - it takes the same
 * personal access token the template push already uses. Every function here is a
 * single file whose one import is resolved by Deno at runtime, which is exactly the
 * shape this endpoint accepts.
 *
 * Nothing about a function's behaviour changes here. The source in
 * supabase/functions/<slug>/index.ts is uploaded verbatim.
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS = join(HERE, '..', 'supabase', 'functions');
const CONFIG = join(HERE, '..', 'supabase', 'config.toml');

/* The functions the application actually calls. provision-teacher (singular) is in
   the directory but nothing references it, so it is not deployed by default. */
const IN_USE = ['provision-teachers', 'provision-students', 'student-class-login', 'request-staff-email-2fa'];

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const dryRun = process.argv.includes('--dry-run');
const project = arg('--project');
const only = arg('--only');
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!project) { console.error('Pass --project <project-ref>.'); process.exit(1); }
if (!token && !dryRun) {
  console.error('Set SUPABASE_ACCESS_TOKEN first: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

/* verify_jwt defaults to true. config.toml turns it off per function, which the
   camper sign-in needs because a camper has no session when it is called. */
let config = '';
try { config = await readFile(CONFIG, 'utf8'); } catch { /* optional */ }
function verifyJwt(slug) {
  const block = new RegExp(`\\[functions\\.${slug}\\][^\\[]*`, 'm').exec(config);
  if (!block) return true;
  return !/verify_jwt\s*=\s*false/.test(block[0]);
}

const available = (await readdir(FUNCTIONS, { withFileTypes: true }))
  .filter((e) => e.isDirectory()).map((e) => e.name);

const slugs = only ? [only] : IN_USE.filter((s) => available.includes(s));
const orphans = available.filter((s) => !IN_USE.includes(s));
if (!only && orphans.length) {
  console.log(`  note     not deployed (nothing calls them): ${orphans.join(', ')}\n`);
}

const api = (path, init = {}) => fetch(`https://api.supabase.com/v1/projects/${project}${path}`, {
  ...init,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
});

/* What is already on the project, so each function is created or updated rather than
   blindly created - a second create would be rejected as a duplicate slug. */
let existing = new Set();
if (!dryRun) {
  const list = await api('/functions');
  if (!list.ok) {
    console.error(`Could not list functions: ${list.status} ${list.statusText}\n${(await list.text()).slice(0, 400)}`);
    if (list.status === 401 || list.status === 403) console.error('\nThe token is wrong, or it has no access to this project.');
    process.exit(1);
  }
  existing = new Set((await list.json()).map((f) => f.slug));
}

let failed = 0;
for (const slug of slugs) {
  let body;
  try {
    body = await readFile(join(FUNCTIONS, slug, 'index.ts'), 'utf8');
  } catch (error) {
    console.error(`  MISSING  ${slug} — ${error.message}`);
    failed += 1;
    continue;
  }

  const jwt = verifyJwt(slug);
  if (dryRun) {
    console.log(`  ready    ${slug.padEnd(26)} ${body.length} bytes, verify_jwt=${jwt}`);
    continue;
  }

  const isUpdate = existing.has(slug);
  const response = isUpdate
    ? await api(`/functions/${slug}`, { method: 'PATCH', body: JSON.stringify({ name: slug, body, verify_jwt: jwt }) })
    : await api('/functions', { method: 'POST', body: JSON.stringify({ slug, name: slug, body, verify_jwt: jwt }) });

  if (!response.ok) {
    console.error(`  FAILED   ${slug.padEnd(26)} ${response.status} ${response.statusText}`);
    console.error(`           ${(await response.text()).slice(0, 300)}`);
    failed += 1;
    continue;
  }
  console.log(`  ${isUpdate ? 'updated' : 'created'}  ${slug.padEnd(26)} ${body.length} bytes, verify_jwt=${jwt}`);
}

if (dryRun) {
  console.log(`\nDry run. Would deploy ${slugs.length} function(s) to ${project}.`);
  process.exit(0);
}
if (failed) {
  console.error(`\n${failed} function(s) failed to deploy.`);
  process.exit(1);
}
console.log('\nDeployed. Create a test teacher; the invitation email should now send.');
