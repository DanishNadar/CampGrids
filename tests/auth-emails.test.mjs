/* Guards the separation between the two staff authentication emails.
 *
 *   node --test tests/
 *
 * The bug these exist to prevent: creating a teacher account emailed "Reset your
 * password", because the browser could only call auth.resetPasswordForEmail and
 * that maps to Supabase's Reset Password template. Several of these tests are
 * therefore static checks on the source, not just on the rendered output - the
 * mapping is the thing that broke, so the mapping is what is asserted.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { staffAccountCreated, passwordReset, templates } from '../supabase/email/templates.mjs';
import { brand } from '../supabase/email/brand.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(join(ROOT, p), 'utf8');

/* ------------------------------------------------------------------------ */
describe('the two flows map to different Supabase actions', () => {
  test('account creation uses the Invite user template', () => {
    assert.equal(staffAccountCreated.supabaseTemplate, 'Invite user');
    assert.equal(staffAccountCreated.configKeys.content, 'mailer_templates_invite_content');
    assert.equal(staffAccountCreated.configKeys.subject, 'mailer_subjects_invite');
  });

  test('password reset uses the Reset Password template', () => {
    assert.equal(passwordReset.supabaseTemplate, 'Reset Password');
    assert.equal(passwordReset.configKeys.content, 'mailer_templates_recovery_content');
    assert.equal(passwordReset.configKeys.subject, 'mailer_subjects_recovery');
  });

  test('the two never share a template or a config key', () => {
    assert.notEqual(staffAccountCreated.supabaseTemplate, passwordReset.supabaseTemplate);
    assert.notEqual(staffAccountCreated.configKeys.content, passwordReset.configKeys.content);
    assert.notEqual(staffAccountCreated.configKeys.subject, passwordReset.configKeys.subject);
  });

  test('activation is never wired to the recovery action', () => {
    // The precise crossover that caused the original bug.
    assert.notEqual(staffAccountCreated.configKeys.content, 'mailer_templates_recovery_content');
    assert.notEqual(passwordReset.configKeys.content, 'mailer_templates_invite_content');
  });
});

/* ------------------------------------------------------------------------ */
describe('activation email never reads as a password reset', () => {
  const html = staffAccountCreated.html();
  const text = staffAccountCreated.text();

  test('subject and preheader describe account activation', () => {
    assert.equal(staffAccountCreated.subject, 'Your MSI staff account is ready');
    assert.match(staffAccountCreated.preheader, /activating your MSI account/i);
    assert.doesNotMatch(staffAccountCreated.subject, /reset/i);
  });

  test('body never says "reset your password" or "request to reset"', () => {
    for (const body of [html, text]) {
      assert.doesNotMatch(body, /reset your password/i);
      assert.doesNotMatch(body, /request to reset/i);
      assert.doesNotMatch(body, /we received a request/i);
    }
  });

  test('the call to action is about setting up, not resetting', () => {
    assert.match(html, /Set Up My Account/);
    assert.doesNotMatch(html, /Reset Password<\/a>/);
  });

  test('it carries a confirmation link and not a one-time code', () => {
    assert.ok(html.includes('{{ .ConfirmationURL }}'));
    assert.ok(!html.includes('{{ .Token }}'));
  });
});

/* ------------------------------------------------------------------------ */
describe('password reset email is only about recovery', () => {
  const html = passwordReset.html();

  test('subject and preheader describe recovery', () => {
    assert.equal(passwordReset.subject, 'Reset your MSI password');
    assert.match(passwordReset.preheader, /choose a new password/i);
  });

  test('it states the request was received and can be ignored', () => {
    assert.match(html, /received a request to reset the password/i);
    assert.match(html, /did not request this password reset/i);
    assert.match(html, /safely ignore/i);
  });

  test('it never claims an account was just created', () => {
    assert.doesNotMatch(html, /account has been created/i);
    assert.doesNotMatch(html, /account is ready/i);
  });

  test('the call to action is Reset Password', () => {
    assert.match(html, /Reset Password/);
    assert.doesNotMatch(html, /Set Up My Account/);
  });
});

/* ------------------------------------------------------------------------ */
describe('no account-creation code path triggers password recovery', () => {
  /* resetPasswordForEmail is the recovery API. It is legitimate on a sign-in page,
     where a person is asking to recover an existing account, and illegitimate
     anywhere that creates or re-invites an account. */
  const allowed = new Set(['account.js', 'admin/admin-login.js']);

  test('recovery is called only from the sign-in pages', async () => {
    const offenders = [];
    for (const file of ['admin-teacher-entry.js', 'dashboard.js', 'settings.js', 'password-setup.js']) {
      let source = '';
      try { source = await read(file); } catch { continue; }
      // Strip comments so prose about the bug does not trip the check.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (code.includes('resetPasswordForEmail')) offenders.push(file);
    }
    assert.deepEqual(offenders, [], `these files must not call the recovery API: ${offenders.join(', ')}`);
  });

  test('the sign-in pages point recovery at the reset page', async () => {
    for (const file of allowed) {
      const source = await read(file);
      assert.match(source, /reset-password\.html/, `${file} should send recovery to reset-password.html`);
      assert.doesNotMatch(source, /account-setup\.html/, `${file} must not send recovery to the activation page`);
    }
  });

  test('creating and re-inviting a teacher go through the invite function', async () => {
    const entry = await read('admin-teacher-entry.js');
    assert.match(entry, /functions\.invoke\('provision-teachers'/, 'creation must use the Edge Function invite path');
    assert.match(entry, /action: 'resend'/, 're-invite must use the function resend action');
    const dash = await read('dashboard.js');
    assert.match(dash, /action: 'resend'/, 'the pending-password panel must re-invite, not recover');
  });

  test('the Edge Function invites and never recovers', async () => {
    const fn = await read('supabase/functions/provision-teachers/index.ts');
    assert.match(fn, /inviteUserByEmail/);
    assert.doesNotMatch(fn, /resetPasswordForEmail/);
    assert.match(fn, /account-setup\.html/, 'invites must land on the activation page');
  });
});

/* ------------------------------------------------------------------------ */
describe('built templates are in step with their sources', () => {
  test('buildEmails --check passes', async () => {
    // Fails if a component changed without rebuilding, which would otherwise mean
    // pushing stale HTML.
    const { stdout } = await run(process.execPath, ['scripts/buildEmails.mjs', '--check'], { cwd: ROOT });
    assert.match(stdout, /up to date/);
  });

  test('every template has an HTML and a plain-text file', async () => {
    const files = await readdir(join(ROOT, 'supabase', 'email-templates'));
    for (const t of templates) {
      assert.ok(files.includes(`${t.id}.html`), `missing ${t.id}.html`);
      assert.ok(files.includes(`${t.id}.txt`), `missing ${t.id}.txt`);
    }
  });

  test('the retired hand-written invite file is gone', async () => {
    const files = await readdir(join(ROOT, 'supabase', 'email-templates'));
    assert.ok(!files.includes('account-invitation.html'), 'account-invitation.html was superseded and should not linger');
  });
});

/* ------------------------------------------------------------------------ */
describe('email markup is safe for mail clients', () => {
  for (const t of templates) {
    test(`${t.id}: no scripts, no external stylesheet, table layout`, () => {
      const html = t.html();
      assert.doesNotMatch(html, /<script/i);
      assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
      assert.doesNotMatch(html, /position\s*:\s*(absolute|fixed)/i);
      assert.doesNotMatch(html, /display\s*:\s*(flex|grid)/i);
      assert.match(html, /<table role="presentation"/);
    });

    test(`${t.id}: container is 600-700px and responsive`, () => {
      const html = t.html();
      assert.ok(brand.layout.width >= 600 && brand.layout.width <= 700, 'card width must sit in 600-700px');
      assert.match(html, new RegExp(`max-width:${brand.layout.width}px`));
      assert.match(html, /@media only screen/);
      assert.match(html, /name="viewport"/);
    });

    test(`${t.id}: uses real brand tokens, not invented colors`, () => {
      const html = t.html();
      assert.ok(html.includes(brand.color.accent), 'must use the MSI orange token');
      assert.ok(html.includes(brand.color.ink));
      // Every 6-digit hex in the output has to be a declared token.
      const declared = new Set(Object.values(brand.color).map((v) => v.toLowerCase()));
      const used = new Set((html.match(/#[0-9a-fA-F]{6}/g) || []).map((v) => v.toLowerCase()));
      const stray = [...used].filter((v) => !declared.has(v));
      assert.deepEqual(stray, [], `undeclared colors: ${stray.join(', ')}`);
    });

    test(`${t.id}: button survives Outlook and has a text fallback`, () => {
      const html = t.html();
      assert.match(html, /v:roundrect/, 'Outlook needs a VML button');
      assert.match(html, /\[if !mso\]/, 'other clients need the anchor button');
      assert.match(html, /paste this address into your browser/i);
    });

    test(`${t.id}: logo has alt text and is small`, () => {
      const html = t.html();
      assert.match(html, /alt="Museum of Science and Industry"/);
      assert.ok(brand.logo.width <= 80 && brand.logo.height <= 80, 'logo must stay small');
    });

    test(`${t.id}: has a preheader and no emoji`, () => {
      const html = t.html();
      assert.ok(t.preheader && t.preheader.length > 10);
      assert.doesNotMatch(html, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    });
  }
});

/* ------------------------------------------------------------------------ */
describe('security properties', () => {
  test('no template can contain a password or a raw token', () => {
    for (const t of templates) {
      const body = `${t.html()} ${t.text()}`;
      assert.doesNotMatch(body, /\{\{\s*\.Password/i);
      assert.doesNotMatch(body, /temporary password/i);
      assert.doesNotMatch(body, /your password is/i);
    }
  });

  test('nothing logs a token, a link, or a password', async () => {
    for (const file of ['password-setup.js', 'admin-teacher-entry.js', 'scripts/pushEmailTemplates.mjs']) {
      const source = await read(file);
      const logs = source.match(/console\.(log|warn|error|info)\([^\n]*/g) || [];
      for (const line of logs) {
        /* Naming an environment variable in a help message is fine and useful. What
           must never happen is a secret's *value* reaching the console, and that
           requires interpolating it - so this looks for interpolation rather than
           for the word appearing anywhere in the string. */
        /* The interpolation has to *be* the secret, not merely mention it: the
           expression must end right after the name. Object.keys(payload).length
           contains "key" and is obviously harmless. */
        assert.doesNotMatch(line, /\$\{\s*[\w.]*\b(token|password|secret|apiKey|anonKey|serviceRole)\b\s*\}/i, `${file} interpolates a secret into a log: ${line}`);
        assert.doesNotMatch(line, /[,(]\s*(token|password|accessToken|serviceRole|anonKey)\s*[,)]/i, `${file} passes a secret to a log: ${line}`);
        assert.doesNotMatch(line, /process\.env\.[A-Z_]*(TOKEN|KEY|SECRET|PASSWORD)\b(?!\s*first)/, `${file} logs an env secret: ${line}`);
      }
    }
  });

  test('the landing page refuses a link of the wrong kind', async () => {
    const source = await read('password-setup.js');
    // An invite arriving on the recovery page, and the reverse, must be sent on
    // rather than silently treated as the other flow.
    assert.match(source, /type === 'recovery'/);
    assert.match(source, /type === 'invite'/);
    assert.match(source, /reset-password\.html/);
    assert.match(source, /account-setup\.html/);
  });

  test('the landing page explains an expired or used link', async () => {
    const source = await read('password-setup.js');
    assert.match(source, /expiredHeading/);
    assert.match(source, /error_code/, 'an expired link arrives as an error in the fragment');
  });

  test('the password is only ever sent to updateUser', async () => {
    const source = await read('password-setup.js');
    assert.match(source, /auth\.updateUser\(\{ password \}\)/);
    // Never persisted by the application itself.
    assert.doesNotMatch(source, /from\('profiles'\)[\s\S]{0,120}password/);
    assert.doesNotMatch(source, /localStorage|sessionStorage/);
  });
});

/* ------------------------------------------------------------------------ */
describe('deployment covers every function the application calls', () => {
  test('each invoked function exists on disk and is in the deploy list', async () => {
    const deploy = await read('scripts/deployFunctions.mjs');
    const inUse = (deploy.match(/const IN_USE = \[([^\]]*)\]/) || [])[1] || '';
    const listed = new Set((inUse.match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, '')));

    // Every functions.invoke('x') anywhere in the front end.
    const invoked = new Set();
    for (const file of ['account.js', 'admin/admin-login.js', 'admin-teacher-entry.js', 'dashboard.js']) {
      const source = await read(file);
      for (const m of source.matchAll(/functions\.invoke\(\s*'([^']+)'/g)) invoked.add(m[1]);
    }

    assert.ok(invoked.size > 0, 'expected the front end to invoke at least one function');
    const dirs = new Set(await readdir(join(ROOT, 'supabase', 'functions')));
    for (const slug of invoked) {
      assert.ok(dirs.has(slug), `${slug} is invoked but has no supabase/functions/${slug}`);
      assert.ok(listed.has(slug), `${slug} is invoked but is not in deployFunctions IN_USE`);
    }
  });

  test('every deployable function is a single file with resolvable imports', async () => {
    const deploy = await read('scripts/deployFunctions.mjs');
    const inUse = (deploy.match(/const IN_USE = \[([^\]]*)\]/) || [])[1] || '';
    for (const slug of (inUse.match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''))) {
      const files = await readdir(join(ROOT, 'supabase', 'functions', slug));
      assert.deepEqual(files, ['index.ts'], `${slug} must be a single index.ts to deploy via the Management API`);
      const source = await read(`supabase/functions/${slug}/index.ts`);
      for (const m of source.matchAll(/^import .* from ["']([^"']+)["']/gm)) {
        assert.match(m[1], /^(npm:|https:|jsr:|node:)/, `${slug} imports ${m[1]}, which a single-file deploy cannot resolve`);
      }
    }
  });
});
