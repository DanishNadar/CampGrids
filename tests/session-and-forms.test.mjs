/* The staff session limit, the required-field markers, and the cell preview.
 *
 *   node --test tests/session-and-forms.test.mjs
 *
 * These guard decisions that are easy to undo by accident: a session length that
 * lives in two places and drifts, a navigation that shows someone's name after they
 * have to re-identify, and a grid cell that goes back to being a single button.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(join(ROOT, file), 'utf8');

describe('the staff session limit', () => {
  const MIGRATION = 'supabase/migrations/20260921_staff_session_limit.sql';

  test('the limit is ten hours and is declared once', async () => {
    const sql = await read(MIGRATION);
    assert.match(sql, /create or replace function public\.staff_session_limit\(\)/);
    assert.match(sql, /select interval '10 hours'/);
  });

  test('no migration issues a session with a hardcoded length any more', async () => {
    const dir = join(ROOT, 'supabase', 'migrations');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const latest = new Map();
    /* Later migrations replace earlier definitions, so only the last file that
       writes a session row decides the behaviour. */
    for (const file of files) {
      const sql = await readFile(join(dir, file), 'utf8');
      if (/insert into public\.staff_email_2fa_sessions/.test(sql)) latest.set('writer', { file, sql });
    }
    const writer = latest.get('writer');
    assert.ok(writer, 'nothing writes a staff session');
    assert.equal(writer.file, '20260921_staff_session_limit.sql',
      `${writer.file} now issues the session and must use staff_session_limit()`);
    assert.match(writer.sql, /now\(\) \+ public\.staff_session_limit\(\)/);
  });

  test('the age of the verification is checked, not only the stored expiry', async () => {
    const sql = await read(MIGRATION);
    /* expires_at alone is written once at verification time, so a row issued under
       an older, longer limit would outlive a change to it. */
    assert.match(sql, /s\.verified_at > now\(\) - public\.staff_session_limit\(\)/,
      'is_staff_2fa_verified must compare verified_at against the limit');
    assert.match(sql, /s\.expires_at > now\(\)/, 'the stored expiry is still honoured');
  });

  test('re-verifying restarts the clock', async () => {
    const sql = await read(MIGRATION);
    assert.match(sql, /on conflict \(session_id\) do update[\s\S]*?verified_at = now\(\)/);
  });
});

describe('the account shown in the navigation', () => {
  test('a staff session is checked before the name is shown', async () => {
    const source = await read('supabase-client.js');
    assert.match(source, /staffSessionExpired/, 'updateAccountNavigation must consult the staff session');
    assert.match(source, /rpc\('staff_session_state'\)/,
      'the database decides, and it must also say whether setup is still pending');

    /* The check has to happen before the name, avatar and workspace link are
       written, or the account is shown for the moment before it is taken away. */
    const checkAt = source.indexOf('await staffSessionExpired(profile)');
    const labelAt = source.indexOf('label.textContent = name');
    assert.ok(checkAt > 0 && labelAt > 0, 'both the check and the personalization must exist');
    assert.ok(checkAt < labelAt, 'the session is checked after the name is already on screen');
  });

  test('an expired staff session ends the session rather than only hiding it', async () => {
    const source = await read('supabase-client.js');
    const block = source.slice(source.indexOf('await staffSessionExpired(profile)'));
    assert.match(block.slice(0, 260), /auth\.signOut\(\)/,
      'hiding the name while leaving a live session is a cosmetic lock');
  });

  test('a camper is never asked about a staff session', async () => {
    const source = await read('supabase-client.js');
    assert.match(source, /if \(profile\.role !== 'teacher' && profile\.role !== 'admin'\) return false;/);
  });

  test('an unreachable check does not sign anyone out', async () => {
    /* A network failure is not evidence that a session has expired; treating it as
       such would sign people out whenever the database hiccuped. */
    const source = await read('supabase-client.js');
    assert.match(source, /if \(error\) return false;/);
  });
});

describe('required fields', () => {
  test('required fields are marked and optional ones are not', async () => {
    const source = await read('site.js');
    assert.match(source, /markRequiredFields/);
    assert.match(source, /input\[required\], select\[required\], textarea\[required\]/);
    assert.match(source, /'\*Required'/);
    /* Each field is labelled individually, so there must be no second note at the
       foot of the form repeating it. */
    assert.ok(!source.includes('requiredLegend'),
      'a form-level *Required note duplicates the per-field labels');
  });

  test('views rendered after load are covered', async () => {
    /* The dashboard replaces its whole workspace after this script has run, so a
       single pass at load would mark nothing in it. */
    const source = await read('site.js');
    assert.match(source, /new MutationObserver/);
    assert.match(source, /requestAnimationFrame/, 'the observer must coalesce, not fire per node');
  });
});

describe('the grid cell preview', () => {
  test('a populated teacher cell carries both actions', async () => {
    const source = await read('dashboard.js');
    assert.match(source, /data-cell-preview="\$\{cell\.id\}"/);
    assert.match(source, /class="cellSelect" data-class-grid-cell/,
      'selection must move to an inner button so the cell can hold two actions');
  });

  test('opening the preview does not change the selection', async () => {
    const source = await read('dashboard.js');
    const handler = source.slice(source.indexOf('function bindCellPreview()'));
    assert.match(handler.slice(0, 400), /event\.stopPropagation\(\)/,
      'without this the click also reaches the cell and toggles it');
  });

  test('every activity in a cell is shown, with its links', async () => {
    const source = await read('dashboard.js');
    assert.match(source, /previewProjects/);
    assert.match(source, /instructions_url/);
    assert.match(source, /video_url/);
    assert.match(source, /rel="noopener noreferrer"/, 'external activity links must be safe');
  });

  test('the dialog is centred despite the global margin reset', async () => {
    /* styles.css zeroes every margin, which overrides the margin:auto a browser
       uses to centre a modal dialog. */
    const css = await read('styles.css');
    const block = css.slice(css.indexOf('.cellPreview {'), css.indexOf('.cellPreview::backdrop'));
    assert.match(block, /margin: auto;/);
  });
});

describe('a sign-in that times out returns to the sign-in step', () => {
  /* The reported failure: a tab left open on the verification step long enough for
     the session to lapse. Every button then answered "Sign in with your password
     before requesting an email code" and the only way out was a quiet link. The
     reset already existed; nothing called it. */
  const PAGES = [
    {
      file: 'admin/admin-login.js',
      reset: 'resetVerificationForm()',
      back: 'function returnToSignIn(',
      guard: 'if (!await stillSignedIn(app)) return;',
      ticket: 'if (!state.ticket) return;'
    },
    {
      file: 'account.js',
      reset: 'resetTeacherVerification()',
      back: 'function returnToTeacherSignIn(',
      guard: 'if (!await teacherStillSignedIn(app)) return;',
      ticket: 'if (!teacherState.ticket) return;'
    }
  ];

  for (const page of PAGES) {
    describe(page.file, () => {
      let source = '';
      before(async () => { source = await read(page.file); });

      test('recognises a lapsed session from any layer', () => {
        /* The database guards, the Auth client and an expired JWT all report this
           differently, and none of them as a typed error. */
        assert.ok(source.includes('function sessionLost(error)'), 'sessionLost must exist');
        for (const signal of ['Auth session missing', 'JWT expired', 'Sign in']) {
          assert.ok(source.includes(signal), `sessionLost must recognise "${signal}"`);
        }
      });

      test('has one way back, and it restores the credentials step', () => {
        const at = source.indexOf(page.back);
        assert.ok(at > 0, `${page.back} must exist`);
        const body = source.slice(at, at + 700);
        assert.ok(body.includes(page.reset),
          'it must call the existing reset rather than hiding fields by hand');
        assert.ok(body.includes('signOut'),
          'the dead session must be cleared, not left behind');
      });

      test('the email is carried across so only the password is retyped', () => {
        const at = source.indexOf(page.back);
        const body = source.slice(at, at + 700);
        assert.ok(body.includes('elements.email.value = email'), 'the email must be refilled');
        assert.ok(/password.*focus\(\)/s.test(body), 'the cursor belongs in the password field');
      });

      test('the guard runs before a code is verified', () => {
        assert.ok(source.includes(page.guard),
          'verifying needs a live session for both the OTP exchange and what follows');
      });

      test('both the submit and the resend paths recover', () => {
        const recoveries = source.split('if (sessionLost(error)) {').length - 1;
        assert.ok(recoveries >= 2,
          `expected the submit and resend handlers to recover, found ${recoveries}`);
      });

      test('a tab being looked at again recovers before anything is clicked', () => {
        const at = source.indexOf("addEventListener('visibilitychange'");
        assert.ok(at > 0, 'the page must notice when it is looked at again');
        const handler = source.slice(at, at + 400);
        assert.ok(handler.includes(page.ticket),
          'the check belongs only to the verification step, not the credentials step');
      });
    });
  }
});

describe('choosing a password is not an expired session', () => {
  /* is_staff_2fa_verified() is false for two unrelated reasons: the ten-hour
     identification lapsed, or a password is still to be chosen. The navigation
     treated both as expiry and signed the person out - on every page, because the
     navigation is personalised everywhere - so saving a new password failed with
     "Auth session missing!" on every first-time route. */
  test('the database distinguishes the two', async () => {
    const sql = await read('supabase/migrations/20260923_zz_setup_is_not_expiry.sql');
    assert.match(sql, /password_setup_pending boolean/);
    assert.match(sql, /must_change_password/, 'the pending flag must come from the profile');
    assert.match(sql, /teacher_profiles/, 'a teacher carries the flag on their own row too');
  });

  test('the navigation asks, and leaves a setup session alone', async () => {
    const source = await read('supabase-client.js');
    assert.match(source, /rpc\('staff_session_state'\)/,
      'is_staff_2fa_verified alone cannot tell expiry from unfinished setup');

    const fn = source.slice(source.indexOf('async function staffSessionExpired'));
    const guard = fn.indexOf('state.password_setup_pending');
    const verdict = fn.indexOf('state.verified !== true');
    assert.ok(guard > 0, 'the pending case must be handled');
    assert.ok(verdict > 0, 'expiry must still be reported');
    assert.ok(guard < verdict, 'the pending case must be checked before expiry is concluded');
    assert.match(fn.slice(guard, guard + 120), /return false/,
      'a pending setup must not be reported as expired');
  });

  test('a real expiry still ends the session', async () => {
    const source = await read('supabase-client.js');
    const block = source.slice(source.indexOf('await staffSessionExpired(profile)'));
    assert.match(block.slice(0, 260), /auth\.signOut\(\)/);
  });
});

describe('finishing setup is not the same as reusing a password', () => {
  /* temporary_password_reuse_grace() answers one question: may this temporary
     password start another sign-in? It was also gating whether the session already
     in progress could finish. At a grace of zero - the setting that means "one
     sign-in only" - first use is stamped at sign-in and completion was refused a
     second later with "used more than 00:00:00 ago", so activation was impossible. */
  let sql = '';
  before(async () => { sql = await read('supabase/migrations/20260923_zzz_completion_is_not_reuse.sql'); });

  test('completion no longer consults the reuse grace', () => {
    const fn = sql.slice(sql.indexOf('function public.complete_password_setup'));
    const code = fn.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
    assert.ok(!code.includes('temporary_password_reuse_grace'),
      'the reuse grace governs starting a sign-in, not finishing one');
  });

  test('the checks that do belong are kept', () => {
    const fn = sql.slice(sql.indexOf('function public.complete_password_setup'));
    assert.match(fn, /admin_password_setup_window\(\)/, 'the outer issue window still applies');
    assert.match(fn, /staff_email_2fa_sessions/, 'the emailed code is still required');
  });

  test('a duration is not shown to someone as a clock time', () => {
    /* An interval renders as 72:00:00, which reads like a time of day. */
    assert.match(sql, /% hours ago/);
    assert.match(sql, /extract\(epoch from public\.admin_password_setup_window\(\)\) \/ 3600/);
  });

  test('the door is still guarded at sign-in', async () => {
    const single = await read('supabase/migrations/20260923_temporary_password_single_use.sql');
    const begin = single.slice(single.indexOf('function public.begin_password_setup'));
    assert.match(begin, /temporary_password_reuse_grace\(\)/,
      'begin_password_setup is where a second sign-in must be refused');
    assert.match(begin, /retire_temporary_password/);
  });
});
