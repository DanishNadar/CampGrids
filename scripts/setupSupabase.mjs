/* One command that puts everything this project needs onto a Supabase project.
 *
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
 *   node scripts/setupSupabase.mjs --project <ref> --dry-run
 *   node scripts/setupSupabase.mjs --project <ref>
 *
 * Three things have to be true before a staff invitation email can arrive, and
 * missing any one of them produces a different confusing symptom:
 *
 *   1. provision-teachers is deployed   - otherwise the browser cannot invite at all
 *   2. the Invite user template is set  - otherwise Supabase sends its plain default
 *   3. account-setup.html is allowlisted - otherwise the link in the email is refused
 *
 * Doing them together, idempotently, is the point. Every step is safe to re-run.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const dryRun = process.argv.includes('--dry-run');
const project = arg('--project');
const originArg = arg('--origin');
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!project) { console.error('Pass --project <project-ref>.'); process.exit(1); }
if (!token && !dryRun) {
  console.error('Set SUPABASE_ACCESS_TOKEN first: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const api = (path, init = {}) => fetch(`https://api.supabase.com/v1/projects/${project}${path}`, {
  ...init,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
});

async function step(title, fn) {
  console.log(`\n--- ${title} ---`);
  try { await fn(); } catch (error) { console.error(`  ${error.message}`); throw error; }
}

/* 1 and 2 reuse the dedicated scripts rather than duplicating their logic, so their
   own validation (a template missing its placeholder, a crossed-over mapping) still
   applies here. */
async function forward(script, extra = []) {
  const args = [join(HERE, script), '--project', project, ...extra, ...(dryRun ? ['--dry-run'] : [])];
  const { stdout } = await run(process.execPath, args, { cwd: join(HERE, '..') });
  process.stdout.write(stdout.replace(/^/gm, '  ').replace(/^ {2}$/gm, ''));
}

await step('Edge Functions', () => forward('deployFunctions.mjs'));
await step('Email templates', () => forward('pushEmailTemplates.mjs'));

await step('Redirect allowlist', async () => {
  /* The two pages an authentication email can land on. A redirect_to that is not on
     the project's list is refused by Auth, so the link in a delivered email would
     fail at the last step. */
  const pages = ['account-setup.html', 'reset-password.html', 'auth.html'];

  if (dryRun && !token) {
    console.log('  (needs the access token to read the current list; skipped in dry run)');
    return;
  }

  const response = await api('/config/auth');
  if (!response.ok) throw new Error(`Could not read auth config: ${response.status} ${response.statusText}`);
  const cfg = await response.json();

  const origin = originArg || cfg.site_url;
  if (!origin) {
    console.log('  No Site URL is set on the project and no --origin was passed, so the');
    console.log('  redirect entries cannot be built. Set Site URL, or pass --origin https://...');
    return;
  }

  const current = String(cfg.uri_allow_list || '').split(',').map((s) => s.trim()).filter(Boolean);
  const wanted = pages.map((page) => new URL(page, origin.endsWith('/') ? origin : `${origin}/`).href);
  const covered = (url) => current.some((entry) => entry === url || entry.endsWith('/**') || entry.endsWith('/*'));
  const missing = wanted.filter((url) => !covered(url));

  console.log(`  site URL: ${origin}`);
  current.forEach((entry) => console.log(`  already allowed: ${entry}`));
  if (!missing.length) { console.log('  Nothing to add.'); return; }
  missing.forEach((url) => console.log(`  to add:  ${url}`));

  if (dryRun) { console.log('  Dry run, not written.'); return; }

  /* Merged, never replaced: the list may hold entries other parts of the site rely
     on, and this script has no way to know which. */
  const merged = [...current, ...missing].join(',');
  const patch = await api('/config/auth', { method: 'PATCH', body: JSON.stringify({ uri_allow_list: merged }) });
  if (!patch.ok) throw new Error(`Could not update the allowlist: ${patch.status} ${(await patch.text()).slice(0, 200)}`);
  console.log(`  Added ${missing.length} entr${missing.length === 1 ? 'y' : 'ies'}.`);
});

console.log(dryRun
  ? '\nDry run complete. Re-run without --dry-run to apply.'
  : '\nDone. Create a test teacher; the invitation email should now send and its link should open.');
