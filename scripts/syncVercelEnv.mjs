/* Syncs the browser-safe Supabase settings from .env to the Vercel project.
 *
 *   $env:VERCEL_TOKEN = "..."            # https://vercel.com/account/tokens
 *   node scripts/syncVercelEnv.mjs --dry-run
 *   node scripts/syncVercelEnv.mjs
 *
 * Read this before adding anything to the list below.
 *
 * CampGrids deploys as a static site: every file Vercel serves is downloadable by
 * anyone who visits it. An environment variable used at build time to generate a
 * browser file is therefore public the moment it is written into that file. Only
 * values that are already public may be synced here.
 *
 * The Supabase anon key is designed to be public - it is restricted by row-level
 * security. The service-role key and the SMTP password are not, and this script
 * refuses to send them no matter what is in .env.
 *
 * This does NOT affect authentication email. Supabase Auth sends that from its own
 * servers using the project's SMTP settings; nothing on Vercel takes part in it.
 * For that, see scripts/configureSmtp.mjs.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireToken } from './lib/env.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/* Browser-safe only. Each entry names the .env key and the Vercel variable it
   becomes. Adding a secret here would publish it. */
const SAFE = [
  { env: 'SUPABASE_URL', vercel: 'CAMPGRIDS_SUPABASE_URL', why: 'the project URL, already visible in every request the browser makes' },
  { env: 'SUPABASE_ANON_KEY', vercel: 'CAMPGRIDS_SUPABASE_ANON_KEY', why: 'the anon key, public by design and constrained by row-level security' }
];

/* Anything matching these must never reach a static deployment. */
const FORBIDDEN = /SERVICE_ROLE|APP_PASSWORD|SMTP_PASS|ACCESS_TOKEN|SECRET|PRIVATE/i;

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

const dryRun = process.argv.includes('--dry-run');
/* Resolved later: a dry run should work with no token at all. */

let fileEnv = {};
try { fileEnv = parseEnv(await readFile(join(ROOT, '.env'), 'utf8')); } catch { /* reported below */ }
const value = (name) => process.env[name] || fileEnv[name] || '';

/* The anon key already lives in the committed browser config, so fall back to it
   rather than making someone copy it into .env just to run this. */
let committed = '';
try { committed = await readFile(join(ROOT, 'supabase-config.js'), 'utf8'); } catch { /* optional */ }
const fromConfig = (name) => (committed.match(new RegExp(`window\\.${name}\\s*=\\s*'([^']+)'`)) || [])[1] || '';

const resolved = SAFE.map((entry) => ({
  ...entry,
  value: value(entry.env) || fromConfig(entry.vercel)
}));

/* Project identity comes from the Vercel link this repository already carries. */
let projectId = arg('--project');
let teamId = arg('--team');
if (!projectId) {
  try {
    const link = JSON.parse(await readFile(join(ROOT, '.vercel', 'repo.json'), 'utf8'));
    const project = (link.projects || [])[0];
    projectId = project?.id;
    teamId = teamId || link.projects?.[0]?.orgId;
  } catch { /* reported below */ }
}
if (!projectId) {
  console.error('No Vercel project found. Pass --project <prj_...>, or run `vercel link` first.');
  process.exit(1);
}

console.log(`  project ${projectId}${teamId ? `  team ${teamId}` : ''}`);
console.log('');

let blocked = false;
for (const entry of resolved) {
  if (FORBIDDEN.test(entry.env) || FORBIDDEN.test(entry.vercel)) {
    console.error(`  REFUSED  ${entry.vercel} looks like a secret and must not go to a static site.`);
    blocked = true;
    continue;
  }
  if (!entry.value) {
    console.error(`  MISSING  ${entry.env} is not in .env and not in supabase-config.js`);
    blocked = true;
    continue;
  }
  // Length only: the value itself is public, but there is no reason to print it.
  console.log(`  ready    ${entry.vercel.padEnd(30)} ${entry.value.length} chars  (${entry.why})`);
}

/* A secret sitting in .env is fine; one reaching Vercel is not. Say so plainly. */
const secretsPresent = Object.keys(fileEnv).filter((k) => FORBIDDEN.test(k));
if (secretsPresent.length) {
  console.log(`\n  not synced (correctly): ${secretsPresent.join(', ')}`);
  console.log('  These belong to Supabase and this machine, never to a static deployment.');
}

if (blocked) { console.error('\nNothing was synced.'); process.exit(1); }

if (dryRun) {
  console.log(`\nDry run. Would set ${resolved.length} variable(s) on the Vercel project.`);
  process.exit(0);
}
console.log('\n  Reminder: this script does not send or fix authentication email.');
console.log('  That is Supabase: npm run configure:smtp -- --project <ref>');
const token = await requireToken('VERCEL_TOKEN');

const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
const api = (path, init = {}) => fetch(`https://api.vercel.com${path}${query}`, {
  ...init,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
});

/* Existing variables are updated rather than duplicated: Vercel allows several
   entries with the same key across targets, which becomes very confusing. */
const listing = await api(`/v9/projects/${projectId}/env`);
if (!listing.ok) {
  console.error(`Could not read the project's variables: ${listing.status} ${listing.statusText}`);
  console.error((await listing.text()).slice(0, 300));
  process.exit(1);
}
const existing = (await listing.json()).envs || [];

let failed = 0;
for (const entry of resolved) {
  const match = existing.find((e) => e.key === entry.vercel);
  const body = JSON.stringify({
    key: entry.vercel,
    value: entry.value,
    type: 'plain',
    target: ['production', 'preview', 'development']
  });
  const response = match
    ? await api(`/v9/projects/${projectId}/env/${match.id}`, { method: 'PATCH', body })
    : await api(`/v10/projects/${projectId}/env`, { method: 'POST', body });

  if (!response.ok) {
    console.error(`  FAILED   ${entry.vercel}  ${response.status} ${(await response.text()).slice(0, 200)}`);
    failed += 1;
    continue;
  }
  console.log(`  ${match ? 'updated' : 'created'}  ${entry.vercel}`);
}

if (failed) { console.error(`\n${failed} variable(s) failed.`); process.exit(1); }
console.log('\nSynced. Redeploy for the change to take effect:  vercel --prod');
console.log('Note: this does not affect authentication email. That is sent by Supabase,');
console.log('not by Vercel - run  npm run configure:smtp -- --project <ref>  for that.');
