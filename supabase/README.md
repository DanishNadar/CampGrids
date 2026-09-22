# CampGrids Supabase setup

## Security model

Campers use only a class code and CampGrids username. They cannot access another camper's data.

Teachers and MSI administrators must complete two steps before they can access any camper data:

1. Their assigned teacher email/username or administrator email, plus password.
2. A one-time code sent to the email address on their CampGrids account.

The database records the second step against the exact Supabase session for eight hours. Row-level security requires that verified staff session for teacher class access, administrative controls, roster imports, and all other staff access to camper records. A password-only session is not enough.

## Initial project setup

1. Create a Supabase project and run [`schema.sql`](schema.sql) in the SQL editor.
2. Deploy the server-side functions. If PowerShell says `supabase` is not recognized, use `npx` exactly as shown below. It downloads and runs the official CLI without a global installation (Node 20+ is required):

   ```powershell
npx supabase@latest login
$PROJECT_REF = 'your-project-ref'
npx supabase@latest functions deploy provision-students --project-ref $PROJECT_REF
npx supabase@latest functions deploy provision-teachers --project-ref $PROJECT_REF
npx supabase@latest functions deploy student-class-login --project-ref $PROJECT_REF
npx supabase@latest functions deploy request-staff-email-2fa --project-ref $PROJECT_REF
   ```

3. Copy `supabase-config.example.js` to `supabase-config.js` in the site root and provide the project URL and **anon** key. Never place the service-role key in a browser file.
4. In **Authentication -> Providers**, enable Email/password authentication.
5. In **Authentication -> URL Configuration**, set the Site URL to the CampGrids production URL—not another project—and add the exact CampGrids `auth.html` URL to Redirect URLs. Student sign-in uses this allowlist for its one-time link.
6. In **Database -> Replication**, add `navigation_items` and `dropdown_options` to `supabase_realtime` if administrators' live-site changes should appear in open browsers immediately.
7. Serve the site over a local or hosted web server. Supabase Auth does not work reliably from `file://` URLs.

### How staff get their first password

No password is ever generated for a teacher or an administrator. An account is created
with a null `encrypted_password`, which makes Supabase Auth refuse every password
sign-in for it, and the person chooses their own password by following a link emailed
to them. Nothing secret travels through a CSV, a chat message, or a spreadsheet.

1. An administrator creates the account: **Add one teacher** in the dashboard, the
   teacher CSV import, or [`scripts/manage_admin.sql`](scripts/manage_admin.sql) for
   an administrator.
2. CampGrids emails an account invitation. Both the single-teacher form and CSV import
   send it through `inviteUserByEmail` inside the `provision-teachers` function. A
   password-reset request from a sign-in page is a separate recovery email.
3. The link opens `settings.html?password-setup=1`, which is the first and only thing
   the person sees. They choose a password of at least 12 characters, and
   `complete_password_setup()` clears `profiles.must_change_password`.
4. They sign in once with that password and complete email verification as normal.

`is_staff_2fa_verified()` returns false while `must_change_password` is set, so no
camper record is reachable until step 3 is finished. Because the account has no
password before then, the emailed link is the only possible way in.

If a link expires or never arrives, both sign-in pages carry **email me a
set-password link**, and the single-teacher form has **Resend set-password link**.
Supabase rate-limits outgoing mail to roughly one message per recipient per minute, so
a large CSV import may deliver its invitations over several minutes.

Two settings have to be right or the link in the email will not work:

- **Authentication -> URL Configuration -> Redirect URLs** must include the exact
  `settings.html` URL for every origin you serve from, production included. A
  redirect that is not on this list is refused.
- **Authentication -> Emails -> Reset Password** must still contain
  `{{ .ConfirmationURL }}`. This is a different template from **Magic Link**, which
  was rewritten to carry only `{{ .Token }}` for staff verification codes, so the two
  do not interfere. The **Invite user** template needs `{{ .ConfirmationURL }}` too,
  because the CSV import uses it.

Campers are deliberately outside all of this. `provision-students` creates them
against a synthetic address, `username@students.campgrids.local`, which cannot receive
mail, and it never sets a password. Campers sign in with a class code and username
through `student-class-login`. There is no camper password to reset and no camper
inbox to reset it through.

### Configure Gmail-delivered verification codes

Supabase continues to issue and verify the one-time code; Gmail only delivers it through a private SMTP connection. Do not place a Gmail password or app password in this repository, an Edge Function secret, or chat.

1. In the Google account that will send the messages, enable **2-Step Verification** and generate a new, dedicated **App Password** named `CampGrids Supabase SMTP`.
2. In Supabase, go to **Authentication -> Emails -> SMTP Settings**, enable custom SMTP, and enter:

   | Setting | Value |
   | --- | --- |
   | Sender email | Your full Gmail or Google Workspace address |
   | Sender name | CampGrids |
   | Host | `smtp.gmail.com` |
   | Port | `465` with TLS, or `587` with STARTTLS |
   | Username | The same full Gmail address |
   | Password | The Google App Password (entered only in the Supabase dashboard) |

3. Save the SMTP settings. The Email Templates editor becomes available. Open **Authentication -> Emails -> Magic Link** and remove every `{{ .ConfirmationURL }}` reference. This applies to **Magic Link only**, because that template carries the numeric code instead of a link. **Reset Password** and **Invite user** must keep their `{{ .ConfirmationURL }}`, or the set-password button in those emails will go nowhere. Use this subject and body:

   ```text
   Subject: Your CampGrids verification code
   ```

   For the body, paste the whole of [`email-templates/verification-code.html`](email-templates/verification-code.html). It is the MSI-branded version: Pantone Orange 021 header band, the code on a cream panel, request details, and a security note.

   Two things in it are placeholders and should be replaced before the first real send:

   - Both `https://placehold.co/...` image URLs. Email clients cannot read this repository, so these must become absolute `https://` URLs on a host that is public and stable. Relative paths and `data:` URIs do not work.
   - The mailing address in the footer, if a different one should appear.

   The template is deliberately built the old-fashioned way: nested tables, inline styles, no flexbox or grid. Mail clients, Outlook above all, do not render a modern stylesheet, and the `<style>` block near the top only carries the small-screen rules that some clients honour and the rest ignore harmlessly.

Using `{{ .Token }}` sends the numeric one-time code consumed by the CampGrids form. `{{ .Email }}` fills the account line in the details row. Gmail/Google Workspace delivery quotas and organizational SMTP policies still apply; use a dedicated sending account, not a personal mailbox, for a real camp program.

If CampGrids reports that Gmail SMTP could not send a code, first confirm that the sender email and SMTP username are the same full Gmail address, the port/security pair is `465` + TLS or `587` + STARTTLS, and the value in Supabase is a newly generated Google App Password rather than the ordinary Gmail password. The sanitized browser error is intentional; the provider response is available to project administrators in **Edge Functions -> request-staff-email-2fa -> Logs**.

### Staff authentication emails

There are three, and they are three genuinely different events. Keeping them apart is
the whole point of this part of the system:

| Event | Supabase action | Supabase template | Built file | Subject |
| --- | --- | --- | --- | --- |
| An administrator creates a staff account | `admin.inviteUserByEmail()` | **Invite user** | `email-templates/staff-account-created.html` | Your MSI staff account is ready |
| Someone asks to recover an existing password | `auth.resetPasswordForEmail()` | **Reset Password** | `email-templates/password-reset.html` | Reset your MSI password |
| Staff two-factor code | `auth.signInWithOtp()` | **Magic Link** | `email-templates/verification-code.html` | Your MSI verification code |

Account creation and password recovery must never share an email. A new teacher has
never had a password, so telling them to reset one is both confusing and a reason to
distrust the message.

#### Where the emails come from

The templates are composed rather than hand-written, so the header, logo, colours,
button and footer exist once:

```
supabase/email/
  brand.mjs        colours, fonts, logo, organization - every value taken from styles.css
  components.mjs   EmailLayout, EmailHeader, EmailTitle, EmailButton,
                   EmailInfoBox, EmailSteps, EmailSecurityNotice, EmailFooter
  templates.mjs    the two staff emails: messaging, subject, preheader, and the
                   Supabase action each one belongs to
```

`supabase/email-templates/*.html` and `*.txt` are **generated**. Do not edit them by
hand; edit the source and rebuild:

```powershell
npm run build:emails      # render sources to supabase/email-templates/
npm run check:emails      # fail if the built files are stale
```

#### Putting everything on the project at once

Four things must all be true before a staff invitation can arrive, and missing any
one of them looks like a different problem:

1. `provision-teachers` is deployed with browser CORS enabled, or the browser cannot invite at all
2. custom SMTP is configured, or Supabase only permits mail to project-team addresses
3. the **Invite user** template is set, or Supabase sends its plain default
4. `account-setup.html` is on the redirect allowlist, or the link is refused

One idempotent command does all four. It reads the six `GMAIL_SMTP_*` values from
`.env` (or the shell) and never writes or prints the app password:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
npm run setup:supabase -- --project <project-ref> --dry-run
npm run setup:supabase -- --project <project-ref>
```

It works through the Management API, so it needs neither a logged-in CLI nor Docker,
which is what usually blocks `supabase functions deploy`. The allowlist step *merges*
rather than replaces, because that list may hold entries other parts of the site rely
on. Every step is safe to re-run.

The pieces are also available separately: `npm run deploy:functions`,
`npm run configure:smtp`, and `npm run push:emails`.

#### Getting them onto the project

Nothing in this repository reaches Supabase on its own. A template sitting in
`email-templates/` has no effect until it is pushed:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
npm run push:emails -- --project <project-ref> --dry-run
npm run push:emails -- --project <project-ref>
```

The push refuses to run if a template has lost its own placeholder, or if it carries
the *other* flow's placeholder - crossing those two over is exactly how account
creation once ended up sending "Reset your password".

`npm run check:email-config -- --project <project-ref>` is read-only and reports what
is actually live: SMTP, the hourly email limit, the redirect allowlist, and whether
each template on the project matches the local file.

#### Required project settings

- **Authentication -> URL Configuration -> Redirect URLs** must include the exact
  `account-setup.html` and `reset-password.html` URLs for every origin you serve from.
  A `redirect_to` that is not on this list is refused.
- **Authentication -> Emails** must keep `{{ .ConfirmationURL }}` in **Invite user**
  and **Reset Password**. Only **Magic Link** has it removed, because that template
  carries the numeric code instead of a link.
- **Custom SMTP** must be configured before inviting anyone outside the Supabase
  project team. `npm run configure:smtp -- --project <project-ref>` applies the
  `GMAIL_SMTP_*` values from `.env` through the Auth Management API.
- The `provision-teachers` function must be deployed. Inviting is an admin API call,
  so the browser cannot do it:

  ```powershell
  npx supabase@latest functions deploy provision-teachers --project-ref <project-ref>
  ```

  Without it, creating a teacher still creates the account but sends no invitation,
  and says so. It deliberately does **not** fall back to a password-reset email.

#### Where the links land

| Email | Lands on | Heading |
| --- | --- | --- |
| Account activation | `account-setup.html` | Set up your MSI account |
| Password reset | `reset-password.html` | Create a new password |

Both are served by `password-setup.js`, which reads the token type from the URL. An
invitation arriving on the reset page, or a recovery link arriving on the activation
page, is explained and handed on rather than silently treated as the other kind.
Expired and already-used links get their own screen naming the correct expiry window.

#### Tests

```powershell
npm test
```

`tests/auth-emails.test.mjs` asserts the two flows stay separate: that activation is
wired to the invite action and recovery to the recovery action, that the activation
email never contains reset wording, that no account-creation code path calls
`resetPasswordForEmail`, that the built files match their sources, and that no
template or log can carry a password or a token.

### Resending a verification code

Supabase limits passwordless code requests for the same recipient to one per 60 seconds. If the first code arrives, Gmail SMTP is working; wait for the countdown before asking for another code and use the code that already arrived. The sign-in pages enforce this cooldown, and the latest migration preserves the original CampGrids verification ticket when an early resend is rejected.

An accepted request means Supabase Auth successfully handed the message to the configured SMTP server; it does not prove that a recipient inbox displayed it. If a request is accepted but nothing arrives after several minutes, open the sending Gmail account's **Sent** folder first. If it is present there, check the recipient's Spam folder and any Microsoft 365/Google Workspace quarantine. If it is absent, open **Supabase Dashboard -> Edge Functions -> request-staff-email-2fa -> Logs** and look for `Staff email OTP delivery failed`; copy the error text from that log before changing SMTP settings.

## Existing project migration

If this project previously used the phone-based implementation, run [`20260823_zz_staff_email_2fa.sql`](migrations/20260823_zz_staff_email_2fa.sql) once in the SQL editor after the earlier migrations. It deletes the retired phone allowlist and phone-session records, then installs the email-2FA tables, functions, and RLS rules. Then run [`20260824_admin_grid_and_teacher_csv.sql`](migrations/20260824_admin_grid_and_teacher_csv.sql) to add the Mother Grid, class sub-grids, and CSV-only teacher provisioning, followed by [`20260824_zz_fix_staff_email_otp_resend.sql`](migrations/20260824_zz_fix_staff_email_otp_resend.sql) to make code resends safe.

For a new project, `schema.sql` already contains the final email-2FA design; do not run an old phone migration. If the old Edge Function was deployed, it can be removed after the new function is live:

```powershell
supabase functions delete admin-phone-login
```

If the sign-in page says it could not send a code, open **Edge Functions** in the Supabase dashboard and confirm that `request-staff-email-2fa` exists and is active. A `404 Requested function was not found` response means it has not been deployed yet. Deploy it with:

```powershell
$PROJECT_REF = 'your-project-ref'
npx supabase@latest functions deploy request-staff-email-2fa --project-ref $PROJECT_REF
```

You can also use **Deploy a new function -> Via Editor** in the dashboard.

## IT / Super-admin procedure

Only an IT super-admin with Supabase project access creates or resets administrator credentials. Passwords belong in Supabase Auth, never in `public.profiles` or a spreadsheet. The `profiles` table stores only the login name, role, and account status.

### Create an administrator with a password you choose

`supabase/scripts/set_admin.sql` is the IT manager's script: it creates the account
with an email and a password you set, for handing over directly. It is a single
statement, so there is no wrapper to miss and nothing that half-works if only part
of it is pasted:

```sql
select * from public.create_admin_account(
  p_email      => 'newadmin@msichicago.org',
  p_first_name => 'Jordan',
  p_last_name  => 'Smith',
  p_password   => 'Thundering7Bison',
  p_department => 'MSI Camps'
);
```

Add `p_allowed_domains => array['msichicago.org', 'hawk.illinoistech.edu']` to accept
a second domain. `create_admin_account` is granted to `service_role` only, so it can
be called from the SQL editor and the Management API but never from a browser.

What the new administrator then does:

1. Signs in at `/admin/` with that email and password.
2. Receives a verification code at the same MSI mailbox and enters it.
3. Is required to replace your password with one only they know.
4. Reaches the workspace, and is never prompted again.

**Step 2 comes before step 3 deliberately.** The password you issue is a shared
secret until it is replaced, so replacing it has to prove more than knowing it -
otherwise anyone who saw the password in transit could set their own and take the
account. `complete_password_setup()` refuses without a recently verified code, so
the ordering is enforced by the database, not just by the order of the screens.

The script refuses to run unless the password passes
`public.password_policy_violation()`: 12-72 characters, at least one letter and one
digit, no leading or trailing space, and not containing the person's name, their
email, or an obvious word. The check lives in the database so the script cannot be
edited around it.

`v_allowed_domains` refuses an address outside the approved domains, so a typo or a
personal address cannot quietly become an administrator.

An issued password is valid for `public.admin_password_setup_window()` (72 hours).
After that it will not complete setup, and `public.expire_stale_issued_passwords()`
removes the credential entirely from any account that never used it.

The password is never written to `profiles`, to `audit_log`, or to the verification
report. Hand it over directly and issue a different one per administrator.

### Create, reset, or diagnose an administrator

Everything is in **`supabase/scripts/manage_admin.sql`**. Paste the **whole file** into
the SQL editor (**SQL Editor -> New query**) and run it, then edit the block marked
`EDIT THIS`. Pasting only that block gives `syntax error at or near "v_email"` -
those lines are plpgsql declarations and exist only inside the `do $$ ... $$`
wrapper around them:

```sql
v_action     text := 'check';   -- check | create | password | repair | deactivate
v_email      text := 'dnadar@hawk.illinoistech.edu';
v_first      text := 'Danish';
v_last       text := 'Nadar';
v_department text := 'MSI Camps';
v_password   text := '';        -- 12+ chars; blank keeps the account passwordless
v_force_passwordless boolean := false;
```

| `v_action` | What it does |
| --- | --- |
| `check` | Reports on the account and changes nothing. Start here. |
| `create` | Creates the administrator, or promotes an existing account. Set `v_password` to make it usable straight away; leave it blank to use the emailed set-password link. |
| `password` | Sets or replaces the password on an existing account and nothing else. **Use this when a password has stopped working.** |
| `repair` | For an administrator who cannot get in: reactivate, lift a ban, clear a stuck half-accepted invitation, rebuild a missing `admin_profiles` row, heal unreadable Auth columns, end every open session. Keeps an existing password. |
| `deactivate` | Blocks every sign-in at once and keeps the record. |

**No action removes a working password unless you ask for it.** Only `password`
replaces one, and only `repair` with `v_force_passwordless = true` removes one. An
earlier version of this script cleared `encrypted_password` on every run, which is
what made a password appear to be forgotten after each use.

The script prints a report. Read that rather than the notices:

| Column | Meaning |
| --- | --- |
| `sign_in_ready` | Everything the portal checks before it will let them in |
| `next_step` | What to do now, in words |

Then send the set-password email: **People -> Resend invite** in the admin
workspace, or **Authentication -> Users -> Send invitation**.

**No password is ever set or printed.** CampGrids staff accounts are passwordless by
design: the person follows an emailed link and chooses their own password, and
`must_change_password` keeps `is_staff_2fa_verified()` false until they have.

#### If sign-in returns 500 rather than "invalid credentials"

`auth.users` has four columns with no default - `confirmation_token`,
`recovery_token`, `email_change_token_new`, `email_change` - that the Auth service
reads into non-nullable strings. A hand-written `insert` leaves them `NULL`, which
does not fail the insert but makes the row unreadable:

```
500  Database error querying schema
```

It answers 500 for *every* password, including a wrong one, so it looks like a
server outage rather than an account problem. A healthy account returns
`400 Invalid login credentials`. `v_action = 'repair'` heals it, and `create` now
writes `''` into all four.

#### Do not confirm the email by hand

Creating the user through **Authentication -> Users** with *auto-confirm* on, or
opening a set-password link and abandoning it, leaves the account confirmed with no
password. Supabase then refuses to invite that address at all:

```
422  A user with this email address has already been registered
```

There is no supported API to undo the confirmation - `PUT /admin/users` with
`email_confirm: false` and with `email_confirmed_at: null` both answer `200` and
leave it in place. `manage_admin.sql` with `v_action = 'repair'` clears it directly,
and `provision-teachers` calls `reopen_staff_invitation()` to do the same
automatically when a resend hits that error.

Administrator usernames are generated as first initial + last name (`Danish Nadar`
becomes `dnadar`), with a numeric suffix on collision. The username is an internal
identifier; administrators sign in with their email address.

### Session length

A staff member stays identified for **10 hours** after entering their email
verification code. The value lives in one place, `public.staff_session_limit()`, and
changing it takes effect immediately - including for sessions already open, because
`is_staff_2fa_verified()` compares `verified_at` against the limit rather than
trusting the expiry stored on the row.

Once it lapses the site navigation stops showing the account and signs the session
out, so the person has to re-identify rather than seeing their name on a session
that no longer grants anything.

### Deactivate or remove access

- **People** in the admin workspace is the normal route: deactivate blocks every
  sign-in at once and keeps the person's record; delete is refused when work would
  be lost with it.
- Setting `is_active = false` in `public.profiles` has the same immediate effect -
  existing email-verified sessions fail the database check on their next query.
- Keep the staff email current. The verification code always goes to
  `profiles.email`, which comes from the Auth email identity.
- Teacher accounts are created only from the verified administrator dashboard:
  **People -> Add a teacher** for one, or the teacher CSV import for a batch. Both
  send an invitation; neither produces a password to hand over.

## Admin CSV workflows and the Mother Grid

The verified administrator dashboard is intentionally limited to these administrative controls:

- Maintain the **Mother Grid**. Click any cell to update it, or an empty cell to add an activity. The cell may include a category, instructions, and a resource URL.
- Add campers from a class-specific CSV.
- Add teachers from a CSV and download the generated username / temporary-password report.
- Publish generated pages, add live menu links, and update live option lists.

Teacher CSV columns:

```csv
first_name,last_name,email,title
Fannie,Yu,fannie.yu@example.org,Camp Instructor
```

`first_name`, `last_name`, and `email` are required. `title` is optional. CampGrids allocates each username as first initial plus last name (`fyu`, `fyu1`, and so on) and emails each teacher a link to set their own password. No password is generated, so the downloaded report lists who was created and whether their invitation was sent — never a credential.

Student CSV columns remain:

```csv
first_name,last_name,grade,guardian_name,guardian_email
Fannie,Yu,5,,
```

The teacher selects a class, clicks the Mother Grid cells that should make up that class's sub-grid, and those selections save directly to `class_grid_cells`. Campers enrolled in that class see the same selected Grid in their dashboard. Mother Grid cells remain administrator-managed; teachers can only add or remove selections for classes they manage.

### Teacher first sign-in

1. The administrator creates the account. CampGrids emails a set-password link to the teacher's work address; nothing has to be shared by hand.
2. The teacher opens that email and chooses a password on `account-setup.html`. Until they do, the account appears under **Waiting on a password** in the admin workspace and cannot sign in at all — it has no password to sign in with.
3. They then sign in on the Teacher tab and complete emailed 2FA.
4. If the email never arrives, use **Resend invite** on that row. Never send a password-reset email instead: it says "reset your password" to someone who has never had one.

Add this exact URL to **Authentication → URL Configuration → Redirect URLs** so the recovery email can return safely:

```text
https://camp-grids.vercel.app/settings.html?password-reset=teacher
```

Also add your local equivalent during development, for example `http://localhost:3000/settings.html?password-reset=teacher`. The recovery email uses Supabase's **Reset Password** template and the same custom Gmail SMTP configuration described above.

## Verification checklist

1. Sign in at `/admin` with an administrator email address and password. A code should arrive at that email address.
2. Enter the code. The administrator dashboard should load only after it is accepted.
3. Sign in through the Teacher tab with a teacher username/email and password. The teacher dashboard should load only after an email code is accepted.
4. Open a staff dashboard with a password-only session or after more than eight hours. It must redirect to sign-in and must not expose camper data.
5. Sign in as a camper with a valid class code and username. No password or staff email code should be requested.

Only MSI administrators can modify the Mother Grid, create teacher accounts, upload camper rosters, publish pages, add live menu links, or update option lists. Camper uploads use a standardized `.csv` with headers `first_name`, `last_name`, `grade`, `guardian_name`, and `guardian_email`; the dashboard shows generated student usernames immediately after accounts are created.
