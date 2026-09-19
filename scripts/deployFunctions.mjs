/* Deploys the Supabase Edge Functions straight from this repository.
 *
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
 *   node scripts/deployFunctions.mjs --project <ref> --dry-run
 *   node scripts/deployFunctions.mjs --project <ref>
 *   node scripts/deployFunctions.mjs --project <ref> --only provision-teachers
 *
 * Why this exists: `supabase functions deploy` needs the CLI logged in, and on some
 * machines Docker as well. The Management API needs neither - it takes the same
 * personal access token the template push already uses. Its current deployment
 * endpoint accepts a multipart form containing the source file and metadata.
 *
 * Nothing about a function's behaviour changes here. The source in
 * supabase/functions/<slug>/index.ts is uploaded verbatim.
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireToken } from './lib/env.mjs';

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
if (!project) { console.error('Pass --project <project-ref>.'); process.exit(1); }
const token = dryRun ? '' : await requireToken('SUPABASE_ACCESS_TOKEN');

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

  /* POST /functions/deploy is an upsert. The older JSON endpoints used by this
     script no longer upload source code, so they left production on the old
     CORS-broken function even when setup appeared to have run. Do not set a
     Content-Type header here: fetch supplies the multipart boundary for FormData. */
  const form = new FormData();
  form.append('metadata', JSON.stringify({ name: slug, entrypoint_path: 'index.ts', verify_jwt: jwt }));
  form.append('file', new Blob([body], { type: 'application/typescript' }), 'index.ts');
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/functions/deploy?slug=${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    console.error(`  FAILED   ${slug.padEnd(26)} ${response.status} ${response.statusText}`);
    console.error(`           ${(await response.text()).slice(0, 300)}`);
    failed += 1;
    continue;
  }
  console.log(`  deployed ${slug.padEnd(26)} ${body.length} bytes, verify_jwt=${jwt}`);
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
