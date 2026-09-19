/* Applies the SQL migrations in supabase/migrations to a project.
 *
 *   node scripts/applyMigrations.mjs --project <ref> --dry-run
 *   node scripts/applyMigrations.mjs --project <ref>
 *   node scripts/applyMigrations.mjs --project <ref> --only 20260917_partner_organizations.sql
 *
 * Uses the Management API's query endpoint, so it needs neither psql, Docker, nor a
 * logged-in CLI - only the access token already in .env.
 *
 * Each migration in this project is written to be idempotent (create ... if not
 * exists, create or replace, drop policy if exists), so re-applying one is safe and
 * is the normal way to bring a project up to date. A record of what ran is kept in
 * public.schema_migrations so a later run can report rather than guess.
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireToken } from './lib/env.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'supabase', 'migrations');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const project = arg('--project');
const only = arg('--only');

if (!project) { console.error('Pass --project <project-ref>.'); process.exit(1); }
const token = dryRun ? '' : await requireToken('SUPABASE_ACCESS_TOKEN');

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try { message = JSON.parse(text).message || text; } catch { /* keep the raw body */ }
    throw new Error(message.slice(0, 500));
  }
  try { return JSON.parse(text); } catch { return []; }
}

const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort();
const selected = only ? files.filter((f) => f === only) : files;
if (only && !selected.length) {
  console.error(`No migration named ${only}. Available:\n  ${files.join('\n  ')}`);
  process.exit(1);
}

if (dryRun) {
  console.log('  Would apply, in order:');
  for (const file of selected) {
    const sql = await readFile(join(MIGRATIONS, file), 'utf8');
    console.log(`    ${file.padEnd(52)} ${sql.length} bytes`);
  }
  console.log(`\nDry run. ${selected.length} migration(s) would run against ${project}.`);
  process.exit(0);
}

/* A ledger of what has run. Created here rather than in a migration so that a
   project which predates this script still gets one. */
await query(`
  create table if not exists public.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now(),
    checksum text
  );
  alter table public.schema_migrations enable row level security;
`);

const applied = new Map(
  (await query('select filename, checksum from public.schema_migrations;'))
    .map((row) => [row.filename, row.checksum])
);

/* Cheap content fingerprint, enough to notice an edited migration. */
const fingerprint = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  return String(hash);
};

let ran = 0;
let failed = 0;

for (const file of selected) {
  const sql = await readFile(join(MIGRATIONS, file), 'utf8');
  const sum = fingerprint(sql);
  const previous = applied.get(file);

  if (previous !== undefined && previous === sum && !force) {
    console.log(`  skipped  ${file.padEnd(52)} already applied`);
    continue;
  }
  const reason = previous === undefined ? 'new' : previous !== sum ? 'changed since it was applied' : 'forced';

  try {
    await query(sql);
    await query(`
      insert into public.schema_migrations (filename, checksum)
      values ('${file.replace(/'/g, "''")}', '${sum}')
      on conflict (filename) do update set checksum = excluded.checksum, applied_at = now();
    `);
    console.log(`  applied  ${file.padEnd(52)} ${reason}`);
    ran += 1;
  } catch (error) {
    console.error(`  FAILED   ${file}`);
    console.error(`           ${error.message}`);
    failed += 1;
    // Stop at the first failure: later migrations usually build on earlier ones.
    break;
  }
}

if (failed) {
  console.error(`\nStopped after a failure. ${ran} migration(s) applied before it.`);
  process.exit(1);
}
console.log(`\n${ran === 0 ? 'Nothing to do; the project is up to date.' : `${ran} migration(s) applied.`}`);
