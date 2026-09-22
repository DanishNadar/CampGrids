/* Runs the Edge Function handlers for real.
 *
 *   node --test tests/edge-functions.test.mjs
 *
 * These functions are only ever exercised through the browser, where the failures
 * that matter are invisible: the dashboard test stubs functions.invoke, so a handler
 * that throws ReferenceError on line one still shows "Invitation sent". That is not
 * hypothetical - an edit removed the declaration of inviteRedirectTo while leaving
 * two uses of it, and every resend 500'd with the administrator told it had worked.
 *
 * So the real handler is loaded here (Node strips the TypeScript itself), its Deno
 * and supabase-js imports are replaced with stubs that reach no network, and each
 * request shape the browser actually sends is put through it. Any undeclared name,
 * bad import, or wrong branch surfaces as a failure rather than a 500 in production.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS = join(ROOT, 'supabase', 'functions');
/* Outside the project: Node refuses to strip types from anything under
   node_modules, and a .ts file dropped in the repo would be picked up by tooling. */
const WORK = join(tmpdir(), 'campgrids-edge-function-tests');

/* A supabase-js stand-in. Every builder method returns the builder so a chain of
   any shape resolves, and calls are recorded so a test can assert what the handler
   asked for rather than only what it returned. */
const STUB = `
export const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

export function createClient(url, key, options) {
  const scenario = globalThis.__scenario;
  const calls = globalThis.__calls;
  const role = key === scenario.serviceRoleKey ? 'admin' : 'caller';

  const result = (data = null, error = null) => ({ data, error });
  const builder = (rows) => {
    const self = {
      select: () => self, eq: () => self, in: () => self, is: () => self, not: () => self,
      order: () => self, limit: () => self,
      maybeSingle: () => Promise.resolve(result(rows.length ? rows[0] : null)),
      single: () => Promise.resolve(result(rows[0] ?? null)),
      then: (resolve, reject) => Promise.resolve(result(rows)).then(resolve, reject)
    };
    return self;
  };

  return {
    auth: {
      getUser: async () => {
        calls.push(\`\${role}:getUser\`);
        return scenario.signedIn === false
          ? result(null, { message: 'not signed in' })
          : result({ user: { id: 'caller-id', email: 'admin@example.org' } });
      },
      admin: {
        inviteUserByEmail: async (email, options) => {
          calls.push(\`invite:\${email}:\${options?.redirectTo}\`);
          if (scenario.inviteFails) return result(null, { message: scenario.inviteFails });
          // Auth refuses a confirmed address until the account has been reopened.
          if (scenario.confirmedInAuth && !globalThis.__reopened) {
            return result(null, { message: 'A user with this email address has already been registered' });
          }
          return result({ user: { id: 'new-user-id', email } });
        },
        createUser: async (attributes) => {
          calls.push(\`createUser:\${attributes.email}\`);
          return result({ user: { id: 'new-user-id', email: attributes.email } });
        },
        deleteUser: async (id) => {
          calls.push(\`deleteUser:\${id}\`);
          return scenario.deleteUserFails ? result(null, { message: scenario.deleteUserFails }) : result({});
        }
      }
    },
    rpc: async (name, args) => {
      calls.push(\`rpc:\${name}:\${JSON.stringify(args ?? {})}\`);
      if (name === 'reopen_staff_invitation' && scenario.reopenSucceeds !== false) globalThis.__reopened = true;
      if (name in (scenario.rpc ?? {})) {
        const value = scenario.rpc[name];
        return value instanceof Error ? result(null, { message: value.message }) : result(value);
      }
      return result(null);
    },
    from: (table) => {
      calls.push(\`from:\${table}\`);
      const rows = scenario.tables?.[table] ?? [];
      const self = builder(rows);
      self.insert = () => { calls.push(\`insert:\${table}\`); return builder([]); };
      self.update = () => { calls.push(\`update:\${table}\`); return builder([]); };
      self.delete = () => { calls.push(\`delete:\${table}\`); return builder([]); };
      self.upsert = () => { calls.push(\`upsert:\${table}\`); return builder([]); };
      return self;
    }
  };
}
`;

const ENV = {
  SUPABASE_URL: 'https://stub.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key'
};

/* Loads one function's handler. The imports are rewritten to the local stub and the
   file keeps its .ts extension, so Node strips the types the same way Deno would. */
async function loadHandler(name) {
  const source = await readFile(join(FUNCTIONS, name, 'index.ts'), 'utf8');
  const rewritten = source.replace(/from\s+"npm:@supabase\/supabase-js@2(?:\/cors)?"/g, 'from "./stub.mjs"');
  const file = join(WORK, `${name}.ts`);
  await writeFile(file, rewritten);

  let handler = null;
  globalThis.Deno = {
    serve: (fn) => { handler = fn; },
    env: { get: (key) => ENV[key] ?? undefined }
  };
  // A fresh query string each time, so a re-import re-runs Deno.serve.
  await import(`${pathToFileURL(file).href}?v=${Date.now()}-${Math.random()}`);
  assert.ok(handler, `${name} never called Deno.serve`);
  return handler;
}

/* One request through a handler under a given scenario. Errors are returned rather
   than thrown so a test can assert on the failure itself. */
async function call(handler, body, scenario = {}) {
  globalThis.__scenario = { serviceRoleKey: ENV.SUPABASE_SERVICE_ROLE_KEY, ...scenario };
  globalThis.__calls = [];
  globalThis.__reopened = false;
  const request = new Request('https://stub.functions.supabase.co/fn', {
    method: 'POST',
    headers: { Authorization: 'Bearer caller-jwt', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  try {
    const response = await handler(request);
    const text = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    return { status: response.status, body: parsed, text, calls: globalThis.__calls };
  } catch (error) {
    return { threw: error, calls: globalThis.__calls };
  }
}

const ADMIN = { rpc: { is_admin: true, allocate_teacher_username: 'fyu', allocate_student_username: 'fyu', is_teacher_of: true } };
const ORIGIN = 'https://camp-grids.vercel.app';

before(async () => {
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });
  await writeFile(join(WORK, 'stub.mjs'), STUB);
});

describe('provision-teachers', () => {
  let handler;
  before(async () => { handler = await loadHandler('provision-teachers'); });

  /* The regression this file exists for. A resend has to reach inviteUserByEmail
     with a usable redirect; a handler that throws looks identical from the browser
     to one that succeeded. */
  test('resending an invitation calls invite and reports success', async () => {
    const result = await call(handler, { action: 'resend', email: 'fannie.yu@example.org', siteOrigin: ORIGIN }, {
      ...ADMIN,
      tables: { profiles: [{ must_change_password: true, role: 'teacher', is_active: true }] }
    });
    assert.equal(result.threw, undefined, `the handler threw: ${result.threw?.stack}`);
    assert.equal(result.status, 200, `expected 200, got ${result.status}: ${result.text}`);
    assert.equal(result.body.resent, true);

    const invite = result.calls.find((entry) => entry.startsWith('invite:'));
    assert.ok(invite, `inviteUserByEmail was never called. Calls: ${result.calls.join(', ')}`);
    assert.equal(invite, `invite:fannie.yu@example.org:${ORIGIN}/account-setup.html`);
  });

  /* The state that broke Resend invitation in production: the teacher opened their
     link once, which confirmed the address, and never chose a password. Auth then
     refuses to invite them, and there is no supported way to undo the confirmation,
     so the account is reopened in the database and the invitation retried. */
  test('a half-accepted invitation is reopened and the invitation resent', async () => {
    const result = await call(handler, { action: 'resend', email: 'stuck@example.org', siteOrigin: ORIGIN }, {
      ...ADMIN,
      confirmedInAuth: true,
      rpc: { ...ADMIN.rpc, reopen_staff_invitation: true },
      tables: { profiles: [{ must_change_password: true, role: 'teacher', is_active: true }] }
    });
    assert.equal(result.threw, undefined, `the handler threw: ${result.threw?.stack}`);
    assert.equal(result.status, 200, `expected 200, got ${result.status}: ${result.text}`);
    assert.equal(result.body.resent, true);

    const invites = result.calls.filter((entry) => entry.startsWith('invite:'));
    assert.equal(invites.length, 2, `expected a retry after reopening. Calls: ${result.calls.join(', ')}`);
    const reopenAt = result.calls.findIndex((entry) => entry.startsWith('rpc:reopen_staff_invitation'));
    assert.ok(reopenAt > 0, 'the account was never reopened');
    assert.ok(result.calls.lastIndexOf(invites[1]) > reopenAt, 'the retry came before the reopen');
  });

  /* The whole point of reopening rather than reaching for recovery. An account that
     has never had a password must never be sent "reset your password". */
  test('a resend never falls back to the password-reset flow', async () => {
    const result = await call(handler, { action: 'resend', email: 'stuck@example.org', siteOrigin: ORIGIN }, {
      ...ADMIN,
      confirmedInAuth: true,
      rpc: { ...ADMIN.rpc, reopen_staff_invitation: true },
      tables: { profiles: [{ must_change_password: true, role: 'teacher', is_active: true }] }
    });
    const forbidden = result.calls.filter((entry) => /recovery|resetPassword|generateLink|magiclink/i.test(entry));
    assert.deepEqual(forbidden, [], `a recovery path was used: ${forbidden.join(', ')}`);
  });

  test('an account that cannot be reopened is reported rather than retried forever', async () => {
    const result = await call(handler, { action: 'resend', email: 'stuck@example.org', siteOrigin: ORIGIN }, {
      ...ADMIN,
      confirmedInAuth: true,
      reopenSucceeds: false,
      rpc: { ...ADMIN.rpc, reopen_staff_invitation: false },
      tables: { profiles: [{ must_change_password: true, role: 'teacher', is_active: true }] }
    });
    assert.equal(result.status, 409);
    assert.match(result.body.error, /could not be reopened|Forgot your password/i);
    assert.equal(result.calls.filter((entry) => entry.startsWith('invite:')).length, 1, 'it kept retrying');
  });

  test('a resend for an account that has already set a password is refused', async () => {
    const result = await call(handler, { action: 'resend', email: 'fannie.yu@example.org', siteOrigin: ORIGIN }, {
      ...ADMIN,
      tables: { profiles: [{ must_change_password: false, role: 'teacher', is_active: true }] }
    });
    assert.equal(result.status, 409);
    assert.match(result.body.error, /already been activated/i);
    assert.ok(!result.calls.some((entry) => entry.startsWith('invite:')), 'an invitation was sent anyway');
  });

  test('a resend for an unknown address says so rather than inviting a stranger', async () => {
    const result = await call(handler, { action: 'resend', email: 'nobody@example.org', siteOrigin: ORIGIN }, { ...ADMIN, tables: { profiles: [] } });
    assert.equal(result.status, 404);
    assert.ok(!result.calls.some((entry) => entry.startsWith('invite:')));
  });

  test('a resend for a deactivated account is refused', async () => {
    const result = await call(handler, { action: 'resend', email: 'fannie.yu@example.org', siteOrigin: ORIGIN }, {
      ...ADMIN,
      tables: { profiles: [{ must_change_password: true, role: 'teacher', is_active: false }] }
    });
    assert.equal(result.status, 409);
    assert.match(result.body.error, /inactive/i);
  });

  test('creating one teacher invites them and never generates a password', async () => {
    const result = await call(handler, {
      teachers: [{ firstName: 'Fannie', lastName: 'Yu', email: 'Fannie.Yu@example.org', title: 'Camp Instructor' }],
      siteOrigin: ORIGIN
    }, ADMIN);
    assert.equal(result.threw, undefined, `the handler threw: ${result.threw?.stack}`);
    assert.equal(result.status, 200, result.text);
    assert.equal(result.body.teachers.length, 1);
    assert.equal(result.body.errors.length, 0);
    assert.equal(result.body.teachers[0].username, 'fyu');
    // The address is normalized before it reaches Auth, or a later resend by the
    // lowercased address would not find the account.
    assert.ok(result.calls.includes(`invite:fannie.yu@example.org:${ORIGIN}/account-setup.html`), result.calls.join(', '));
    assert.ok(!result.calls.some((entry) => /createUser/.test(entry)), 'a password-bearing user was created');
  });

  test('a single teacher is accepted without a CSV filename', async () => {
    const result = await call(handler, {
      teachers: [{ firstName: 'Fannie', lastName: 'Yu', email: 'fannie.yu@example.org' }],
      siteOrigin: ORIGIN
    }, ADMIN);
    assert.equal(result.status, 200, result.text);
  });

  test('a non-CSV upload is still rejected', async () => {
    const result = await call(handler, {
      filename: 'teachers.xlsx',
      teachers: [{ firstName: 'Fannie', lastName: 'Yu', email: 'fannie.yu@example.org' }],
      siteOrigin: ORIGIN
    }, ADMIN);
    assert.equal(result.status, 400);
    assert.match(result.body.error, /CSV template/i);
  });

  test('an unusable site origin is reported instead of emailing a dead link', async () => {
    const result = await call(handler, { action: 'resend', email: 'fannie.yu@example.org', siteOrigin: 'not a url' }, ADMIN);
    assert.equal(result.status, 400);
    assert.match(result.body.error, /site origin/i);
    assert.ok(!result.calls.some((entry) => entry.startsWith('invite:')));
  });

  test('deleting removes the profile first and only then the login', async () => {
    const result = await call(handler, { action: 'delete', userId: 'user-9' }, ADMIN);
    assert.equal(result.threw, undefined, `the handler threw: ${result.threw?.stack}`);
    assert.equal(result.status, 200, result.text);
    const removeAt = result.calls.findIndex((entry) => entry.startsWith('rpc:delete_account'));
    const authAt = result.calls.findIndex((entry) => entry === 'deleteUser:user-9');
    assert.ok(removeAt >= 0, `delete_account was never called. Calls: ${result.calls.join(', ')}`);
    assert.ok(authAt > removeAt, 'the login was deleted before the database agreed to it');
  });

  test('a refused delete leaves the login alone', async () => {
    const result = await call(handler, { action: 'delete', userId: 'user-9' }, {
      ...ADMIN,
      rpc: { ...ADMIN.rpc, delete_account: new Error('That account still leads at least one class.') }
    });
    assert.equal(result.status, 409);
    assert.match(result.body.error, /still leads/);
    assert.ok(!result.calls.includes('deleteUser:user-9'), 'the login was deleted despite the refusal');
  });

  test('a caller who is not a verified administrator is refused', async () => {
    const result = await call(handler, { action: 'resend', email: 'fannie.yu@example.org', siteOrigin: ORIGIN }, { rpc: { is_admin: false } });
    assert.equal(result.status, 403);
    assert.ok(!result.calls.some((entry) => entry.startsWith('invite:')));
  });
});

describe('provision-students', () => {
  let handler;
  before(async () => { handler = await loadHandler('provision-students'); });

  test('one camper can be created without a class', async () => {
    const result = await call(handler, { students: [{ firstName: 'Fannie', lastName: 'Yu', grade: '5' }], classId: null }, ADMIN);
    assert.equal(result.threw, undefined, `the handler threw: ${result.threw?.stack}`);
    assert.equal(result.status, 200, result.text);
    assert.equal(result.body.students.length, 1);
    assert.equal(result.body.errors.length, 0);
    assert.ok(!result.calls.includes('insert:class_enrollments'), 'an enrolment was invented');
    assert.ok(!result.calls.includes('insert:import_batches'), 'a file import was recorded for a single add');
  });

  test('a camper created with a class is enrolled in it', async () => {
    const result = await call(handler, { students: [{ firstName: 'Fannie', lastName: 'Yu' }], classId: 'class-1' }, ADMIN);
    assert.equal(result.status, 200, result.text);
    assert.ok(result.calls.includes('insert:class_enrollments'), result.calls.join(', '));
  });

  test('a roster CSV still records an import batch', async () => {
    const result = await call(handler, {
      classId: 'class-1', filename: 'roster.csv',
      students: [{ firstName: 'Fannie', lastName: 'Yu' }, { firstName: 'Danish', lastName: 'Nadar' }]
    }, ADMIN);
    assert.equal(result.status, 200, result.text);
    assert.equal(result.body.students.length, 2);
    assert.ok(result.calls.includes('insert:import_batches'));
  });

  test('a non-CSV upload is rejected', async () => {
    const result = await call(handler, { classId: 'class-1', filename: 'roster.xlsx', students: [{ firstName: 'F', lastName: 'Y' }] }, ADMIN);
    assert.equal(result.status, 400);
    assert.match(result.body.error, /CSV/i);
  });

  test('an empty roster is rejected', async () => {
    const result = await call(handler, { students: [] }, ADMIN);
    assert.equal(result.status, 400);
  });

  test('a caller who is not a verified administrator is refused', async () => {
    const result = await call(handler, { students: [{ firstName: 'F', lastName: 'Y' }] }, { rpc: { is_admin: false } });
    assert.equal(result.status, 403);
  });
});

describe('every deployed function loads', () => {
  /* deployFunctions.mjs decides what ships. Anything on that list has to at least
     import and register a handler, which is what catches a bad import path. */
  test('each function in the deploy list registers a handler', async () => {
    const source = await readFile(join(ROOT, 'scripts', 'deployFunctions.mjs'), 'utf8');
    const list = source.match(/const IN_USE\s*=\s*\[([^\]]+)\]/s);
    assert.ok(list, 'IN_USE could not be read from deployFunctions.mjs');
    const names = [...list[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
    assert.ok(names.length > 0);

    for (const name of names) {
      // Loading asserts Deno.serve was called; a missing import throws here.
      await loadHandler(name);
    }
  });
});
