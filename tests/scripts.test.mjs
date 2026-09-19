/* Runs every maintenance script for real.
 *
 *   node --test tests/scripts.test.mjs
 *
 * `node --check` only parses a file. It does not resolve imports, so a script that
 * calls a helper it never imported passes the check and then dies at runtime with
 * "requireToken is not defined" - which is exactly what shipped. These tests execute
 * each script in a mode that touches no network and no credentials, and assert the
 * process got far enough to do its own argument handling.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = join(ROOT, 'scripts');

/* Runs a script and returns its output whatever the exit code: several of these
   exit non-zero on purpose (a missing token, a missing argument), and that is a
   correct outcome to assert on. */
function runScript(file, args = [], env = {}) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(SCRIPTS, file), ...args],
      // A blank token so a script cannot reach a real project from the test run.
      { cwd: ROOT, timeout: 30000, env: { ...process.env, SUPABASE_ACCESS_TOKEN: '', VERCEL_TOKEN: '', ...env } },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr, out: `${stdout}${stderr}` })
    );
  });
}

/* How to invoke each script so it does real work without needing a network call or
   a credential. Anything not listed is caught by the coverage test below. */
const CASES = [
  { file: 'buildEmails.mjs', args: ['--check'], expect: /up to date/ },
  { file: 'deployFunctions.mjs', args: ['--project', 'test-ref', '--dry-run'], expect: /Would deploy \d+ function/ },
  { file: 'pushEmailTemplates.mjs', args: ['--project', 'test-ref', '--dry-run'], expect: /Would PATCH \d+ fields/ },
  { file: 'configureSmtp.mjs', args: ['--project', 'test-ref', '--dry-run'], expect: /Would configure custom SMTP/ },
  { file: 'setupSupabase.mjs', args: ['--project', 'test-ref', '--dry-run'], expect: /Dry run complete/ },
  { file: 'applyMigrations.mjs', args: ['--project', 'test-ref', '--dry-run'], expect: /migration\(s\) would run/ },
  { file: 'syncVercelEnv.mjs', args: ['--dry-run'], expect: /Would set \d+ variable/ },
  // These two have no dry run; invoking them with no argument must still reach their
  // own validation rather than crashing.
  { file: 'checkEmailSetup.mjs', args: [], expect: /Pass --project/ },
  { file: 'testOtpDelivery.mjs', args: [], expect: /Pass --to/ },
  { file: 'verifySmtp.mjs', args: [], expect: /AUTH OK|GMAIL_SMTP_|Gmail rejected/ }
];

describe('every maintenance script runs', () => {
  for (const { file, args, expect } of CASES) {
    test(`${file} ${args.join(' ')}`.trim(), async () => {
      const result = await runScript(file, args);

      /* The failures this test exists for: a missing import, a typo in a name, a bad
         path. They all surface as one of these and none are ever acceptable. */
      assert.doesNotMatch(result.out, /ReferenceError/, `${file} threw a ReferenceError:\n${result.out}`);
      assert.doesNotMatch(result.out, /SyntaxError/, `${file} threw a SyntaxError:\n${result.out}`);
      assert.doesNotMatch(result.out, /ERR_MODULE_NOT_FOUND|Cannot find module/, `${file} has an unresolvable import:\n${result.out}`);
      assert.doesNotMatch(result.out, /is not a function/, `${file} called something undefined:\n${result.out}`);

      assert.match(result.out, expect, `${file} did not get far enough. Output:\n${result.out}`);
    });
  }

  test('every script is covered by a case above', async () => {
    const files = (await readdir(SCRIPTS)).filter((f) => f.endsWith('.mjs'));
    const covered = new Set(CASES.map((c) => c.file));
    const uncovered = files.filter((f) => !covered.has(f));
    assert.deepEqual(uncovered, [], `these scripts are never executed by a test: ${uncovered.join(', ')}`);
  });
});

describe('scripts import what they use', () => {
  test('no script calls a helper it has not imported', async () => {
    const files = (await readdir(SCRIPTS)).filter((f) => f.endsWith('.mjs'));
    const offenders = [];
    for (const file of files) {
      const source = await readFile(join(SCRIPTS, file), 'utf8');
      // Names this project imports from its own lib rather than defines locally.
      for (const helper of ['requireToken', 'env']) {
        const calls = new RegExp(`(?<![\\w.])${helper}\\s*\\(`).test(source);
        const defines = new RegExp(`(function|const|let)\\s+${helper}\\b`).test(source);
        const imports = new RegExp(`^import\\s*\\{[^}]*\\b${helper}\\b[^}]*\\}`, 'm').test(source);
        if (calls && !defines && !imports) offenders.push(`${file}: ${helper}`);
      }
    }
    assert.deepEqual(offenders, [], `missing imports: ${offenders.join(', ')}`);
  });

  test('a token is never read straight from process.env in a script', async () => {
    /* Reading process.env directly bypasses the .env fallback, which is the whole
       reason a token had to be re-exported in every new terminal. */
    const files = (await readdir(SCRIPTS)).filter((f) => f.endsWith('.mjs'));
    const offenders = [];
    for (const file of files) {
      const source = await readFile(join(SCRIPTS, file), 'utf8');
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (/process\.env\.(SUPABASE_ACCESS_TOKEN|VERCEL_TOKEN)/.test(code)) offenders.push(file);
    }
    assert.deepEqual(offenders, [], `these read a token without the .env fallback: ${offenders.join(', ')}`);
  });
});
