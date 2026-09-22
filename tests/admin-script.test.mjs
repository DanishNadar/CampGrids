/* supabase/scripts/manage_admin.sql
 *
 *   node --test tests/admin-script.test.mjs
 *
 * Two faults in earlier versions of this script produced the same complaint - "it
 * keeps forgetting my password" - from opposite directions, and both are easy to
 * reintroduce:
 *
 *   1. It cleared encrypted_password on every run, so using it to fix anything
 *      also wiped a working password.
 *   2. Its hand-written insert into auth.users left four token columns NULL. The
 *      Auth service reads those into non-nullable strings, so every sign-in for
 *      that address answered "500 Database error querying schema" - including with
 *      the wrong password, because the row could not be read at all.
 *
 * These are text assertions on the SQL. The behaviour itself was verified against
 * the live project by creating an account, signing in with the password, and
 * checking it survived every other action.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let sql = '';
before(async () => { sql = await readFile(join(ROOT, 'supabase/scripts/manage_admin.sql'), 'utf8'); });

/* The columns with no default in auth.users that the Auth service still requires
   to be non-NULL. */
const TOKEN_COLUMNS = ['confirmation_token', 'recovery_token', 'email_change_token_new', 'email_change'];

describe('an account it creates can actually sign in', () => {
  test('the insert names every token column that has no default', () => {
    const insert = sql.slice(sql.indexOf('insert into auth.users'), sql.indexOf('insert into auth.identities'));
    for (const column of TOKEN_COLUMNS) {
      assert.ok(insert.includes(column),
        `auth.users.${column} has no column default; leaving it NULL makes every sign-in for that address return 500`);
    }
    assert.match(insert, /'',\s*'',\s*'',\s*''/, 'the four token columns must be given empty strings');
  });

  test('repair heals a row that already has them NULL', () => {
    const repair = sql.slice(sql.indexOf("if v_action = 'repair' then"), sql.indexOf("if v_action = 'deactivate' then"));
    for (const column of TOKEN_COLUMNS) {
      assert.match(repair, new RegExp(`${column}\\s*=\\s*coalesce\\(${column}, ''\\)`),
        `repair must heal a NULL ${column}, which is how an existing broken account is fixed`);
    }
  });

  test('the report names the condition rather than leaving a bare 500', () => {
    assert.match(sql, /NULL token columns/i);
    assert.match(sql, /u\.confirmation_token is null/);
  });
});

describe('a working password is never destroyed by accident', () => {
  test('only one place sets encrypted_password to null, and it is opt-in', () => {
    /* Comments describe the behaviour, so only executable lines are examined. */
    const code = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const nulls = [...code.matchAll(/encrypted_password\s*=\s*([^,\n]+)/g)].map((m) => m[1].trim());
    const clearing = nulls.filter((value) => /(^|[^a-z_])null/i.test(value));

    assert.equal(clearing.length, 1, `expected exactly one assignment that can clear the password, found: ${nulls.join(' | ')}`);
    assert.match(clearing[0], /v_force_passwordless/,
      'clearing the password must be guarded by the explicit opt-in flag');
  });

  test('the opt-in defaults to off', () => {
    assert.match(sql, /v_force_passwordless boolean := false/);
  });

  test('setting a password also clears the flag that would force setup again', () => {
    /* must_change_password left true would send someone who already has a password
       into the set-password flow, and keep is_staff_2fa_verified() false. */
    assert.match(sql, /must_change_password\s*=\s*not v_had_pw/);
  });

  test('a password is held to the length the application enforces', () => {
    assert.match(sql, /char_length\(v_password\) < 12/);
  });
});

describe('what it writes would load into the AWS schema', () => {
  test('usernames match the campgrids.accounts constraint', async () => {
    const rds = await readFile(join(ROOT, 'aws/rds/001_account_source_of_truth.sql'), 'utf8');
    const constraint = rds.match(/check \(username ~ '([^']+)'\)/);
    assert.ok(constraint, 'the RDS username constraint could not be read');
    assert.ok(sql.includes(constraint[1]),
      `manage_admin.sql must generate usernames matching the RDS constraint ${constraint[1]}`);
  });

  test('it records the change as an auditable event', () => {
    assert.match(sql, /insert into public\.audit_log/);
    // campgrids.account_audit_events requires ^[a-z][a-z0-9_]{2,80}$.
    assert.match(sql, /'admin_account_' \|\| v_action/);
  });

  test('the report says whether the row is portable', () => {
    assert.match(sql, /portability/);
    assert.match(sql, /campgrids\.accounts/);
  });
});

describe('the portability migration matches the AWS contract', () => {
  let migration = '';
  before(async () => {
    migration = await readFile(join(ROOT, 'supabase/migrations/20260922_account_portability.sql'), 'utf8');
  });

  test('profiles gained the deactivated_at that campgrids.accounts has', () => {
    assert.match(migration, /add column if not exists deactivated_at timestamptz/);
    assert.match(migration, /create trigger profiles_track_deactivation/,
      'is_active is written from several places, so the timestamp must be maintained by trigger');
  });

  test('the Redshift export carries no personal data', async () => {
    const block = migration.slice(migration.indexOf('function public.account_export_for_redshift'));
    const body = block.slice(0, block.indexOf('$$;', block.indexOf('select')));
    for (const forbidden of ['username', 'first_name', 'last_name', 'email']) {
      assert.ok(!body.includes(forbidden),
        `analytics.dim_account must not receive ${forbidden}; the export contract forbids it`);
    }
    assert.match(body, /hmac/, 'rows must be keyed by an HMAC, not a raw id');
  });

  test('the HMAC key is supplied, never stored', () => {
    assert.match(migration, /account_export_for_redshift\(p_hmac_key text\)/);
    assert.match(migration, /length\(coalesce\(p_hmac_key, ''\)\) >= 32/,
      'a weak or missing key must return nothing rather than weakly-keyed identifiers');
  });

  test('the export columns match analytics.dim_account', async () => {
    const redshift = await readFile(join(ROOT, 'aws/redshift/001_account_reporting.sql'), 'utf8');
    const table = redshift.slice(redshift.indexOf('create table if not exists analytics.dim_account'));
    // Stop at the closing paren of the CREATE TABLE, not the one inside varchar(36).
    const columns = [...table.slice(0, table.indexOf('\n)')).matchAll(/^\s{2}([a-z_]+)\s/gm)].map((m) => m[1]);
    assert.ok(columns.length >= 7, `expected the dim_account columns, read: ${columns.join(', ')}`);

    const returns = migration.slice(migration.indexOf('function public.account_export_for_redshift'));
    const shape = returns.slice(returns.indexOf('returns table'), returns.indexOf('language sql'));
    for (const column of columns) {
      assert.ok(shape.includes(column), `the export is missing dim_account.${column}`);
    }
  });
});

/* ------------------------------------------------------------------------ */
describe('create_admin_account issues a password safely', () => {
  let fn = '';
  let script = '';
  before(async () => {
    fn = await readFile(join(ROOT, 'supabase/migrations/20260922_zzz_create_admin_function.sql'), 'utf8');
    script = await readFile(join(ROOT, 'supabase/scripts/set_admin.sql'), 'utf8');
  });

  /* The settings block of the old do $$ ... $$ script read like the thing to run,
     so it got pasted alone - and plpgsql declarations outside their block fail with
     "syntax error at or near v_email", which explains nothing. A single call cannot
     be half-pasted, and a wrong argument is reported by name. */
  test('the script is one statement with no wrapper to miss', () => {
    const executable = script.replace(/--.*$/gm, '').trim();
    assert.ok(!/do\s*\$\$/.test(executable), 'a do-block settings section can be pasted on its own');
    assert.ok(!/\bdeclare\b/i.test(executable), 'bare plpgsql declarations are a syntax error outside their block');
    assert.match(executable, /select \* from public\.create_admin_account\(/);
    assert.equal((executable.match(/;/g) || []).length, 1, 'the script must be exactly one statement');
  });

  test('every argument is passed by name', () => {
    for (const parameter of ['p_email', 'p_first_name', 'p_last_name', 'p_password']) {
      assert.match(script, new RegExp(`${parameter}\\s*=>`), `${parameter} must be passed by name`);
    }
  });

  test('the account it creates can be read by the Auth service', () => {
    const insert = fn.slice(fn.indexOf('insert into auth.users'), fn.indexOf('insert into auth.identities'));
    for (const column of TOKEN_COLUMNS) assert.ok(insert.includes(column), `auth.users.${column} must be given ''`);
  });

  test('the password is held to the policy, inside the function', () => {
    assert.match(fn, /public\.password_policy_violation\(p_password, v_email, v_first, v_last\)/,
      'applying the policy inside the function means no caller can route around it');
  });

  test('an address outside the allowlist is refused', () => {
    assert.match(fn, /p_allowed_domains text\[\] default array\['msichicago\.org'\]/,
      'the default must be the organisation domain, not whatever the last caller used');
    assert.match(fn, /Refusing to make an administrator at %/);
  });

  test('the issued password must be replaced, and expires', () => {
    assert.match(fn, /must_change_password = true/);
    assert.match(fn, /temporary_password_issued_at = now\(\)/,
      'without this the expiry window never starts and the emailed code is never demanded');
  });

  test('the plaintext password is never stored or returned', () => {
    const audit = fn.slice(fn.indexOf('insert into public.audit_log'), fn.indexOf('-------- report'));
    assert.ok(!audit.includes('p_password'), 'the audit entry must not carry the password');

    const report = fn.slice(fn.indexOf('return query'));
    assert.ok(!report.includes('p_password'), 'the returned row must not carry the password');
    for (const match of report.matchAll(/encrypted_password(.{0,12})/g)) {
      assert.match(match[1], /^\s*(is\b|<>|=)/,
        'the report must only compare encrypted_password, never return it');
    }
  });

  /* It mints an administrator. A browser holds the anon key and authenticates as
     anon or authenticated; neither may reach it. */
  test('it is callable only by service_role', () => {
    for (const role of ['public', 'anon', 'authenticated']) {
      assert.match(fn, new RegExp(`revoke execute on function public\.create_admin_account[^;]*from ${role};`),
        `execute must be revoked from ${role}`);
    }
    assert.match(fn, /grant execute on function public\.create_admin_account[^;]*to service_role;/);
  });
});

describe('an issued password cannot be replaced without the emailed code', () => {
  let policy = '';
  before(async () => {
    policy = await readFile(join(ROOT, 'supabase/migrations/20260922_zz_admin_password_policy.sql'), 'utf8');
  });

  test('the check applies only to a password someone else issued', () => {
    /* An invited account arrives through a link already sent to its mailbox, so
       demanding a code there would break activation for every teacher. */
    assert.match(policy, /if issued_at is not null then/);
    const guarded = policy.slice(policy.indexOf('if issued_at is not null then'), policy.indexOf('-- The teacher trigger'));
    assert.match(guarded, /staff_email_2fa_sessions/);
    assert.match(guarded, /Confirm the verification code/);
  });

  test('an issued password expires', () => {
    assert.match(policy, /issued_at < now\(\) - public\.admin_password_setup_window\(\)/);
    assert.match(policy, /create or replace function public\.expire_stale_issued_passwords/);
  });

  test('the code is matched to the account, not to one session id', () => {
    /* Updating a password can rotate the session, so binding to session_id would
       refuse the very request it is meant to allow. */
    const guarded = policy.slice(policy.indexOf('if issued_at is not null then'), policy.indexOf('-- The teacher trigger'));
    assert.match(guarded, /s\.user_id = auth\.uid\(\)/);
    assert.ok(!/s\.session_id/.test(guarded), 'the check must not be bound to a single session id');
  });

  for (const file of ['admin/admin-login.js', 'account.js']) {
    test(`${file} asks for the code before the password is replaced`, async () => {
      const source = await readFile(join(ROOT, file), 'utf8');
      const redirect = source.indexOf('password-reset=staff');
      const requestCode = source.search(/Sending a verification code/);
      assert.ok(redirect > 0 && requestCode > 0, 'both steps must exist');
      assert.ok(requestCode < redirect,
        'the code must be requested before the redirect, or the hardened check dead-ends the sign-in');
      assert.match(source, /passwordChangePending/, 'the pending change must be carried past verification');
    });
  }
});
