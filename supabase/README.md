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
   teacher CSV import, or [`scripts/create_admin.sql`](scripts/create_admin.sql) for
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

### Branded email templates

Supabase ships plain, unbranded defaults for these, so each one has to be pasted in by
hand. There are three, and they are separate templates that never interfere with each
other:

| Supabase template | Paste this file | Subject | Sent by |
| --- | --- | --- | --- |
| **Reset Password** | [`email-templates/password-reset.html`](email-templates/password-reset.html) | `Reset your MSI CampGrids password` | **Email me a set-password link** on both sign-in pages, and admin-initiated recovery resends |
| **Invite user** | [`email-templates/account-invitation.html`](email-templates/account-invitation.html) | `Your MSI CampGrids account is ready` | The single-teacher form and teacher CSV import, through `inviteUserByEmail` |
| **Magic Link** | [`email-templates/verification-code.html`](email-templates/verification-code.html) | `Your CampGrids verification code` | Staff two-factor codes |

Nothing in this repository reaches Supabase on its own, so a template sitting in
`email-templates/` has no effect until it is pushed to the project. Either run the
script, which is the repeatable way:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
node scripts/pushEmailTemplates.mjs --project hofninqlkcuzgboslodq --dry-run
node scripts/pushEmailTemplates.mjs --project hofninqlkcuzgboslodq
```

or paste each file into the dashboard by hand, remembering that the **subject** is a
separate field from the body and has to be changed too.

The script PATCHes six named fields through the Management API rather than using
`supabase config push`, because config push sends the whole auth configuration and
anything missing from `config.toml` reverts to a default — which would silently wipe
the Gmail SMTP settings and the redirect URL allowlist. It refuses to push a template
that has lost its `{{ .ConfirmationURL }}` or `{{ .Token }}`, since that would send a
set-password email with no link or a code email with no code.

Keep the two templates separate. Both need `{{ .ConfirmationURL }}`, but their
meaning is intentionally different: **Invite user** welcomes a teacher whose account
has just been created, while **Reset Password** is only for a requested or
administrator-initiated password recovery.

Both templates already carry the MSI mark, served from this repository over https at
`raw.githubusercontent.com/DanishNadar/CampGrids/main/assets/MSI_Logo.png`. That works
because email clients need an absolute public URL: a relative path cannot resolve, and
Gmail and Outlook both refuse a `data:` URI. It does depend on the repository staying
public on that branch, so a stable URL on an MSI-controlled host is better for a real
programme — changing it means editing the two `<img src>` values and pushing again.

### The sender name and avatar

Neither is set in this repository, and neither can be changed from code.

- **Sender name** is **Authentication -> Emails -> SMTP Settings -> Sender name** in
  Supabase. It currently reads `MSI`; `MSI CampGrids` reads better beside the subject
  line in an inbox.
- **The avatar** beside the sender in Gmail is the Google profile photo of the account
  doing the sending. It is not part of the message, so no template change affects it.
  Sign in as that sending address at <https://myaccount.google.com/personal-info> and
  replace the profile picture with the MSI mark. If the sender is a personal Gmail
  account with someone's own photo on it, that photo is what every recipient sees.

For a real camp programme, send from a dedicated Google Workspace address on an MSI
domain rather than a personal Gmail account: the display name and avatar are then
managed by the organisation, the address itself carries MSI's domain, and a verified
logo can be published through BIMI so clients show the mark rather than an initial.

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

### Create an administrator

1. In **Authentication -> Users**, create the staff user's Auth account with their MSI email address and a unique temporary password. Mark the email confirmed when creating the user.
2. In the SQL editor, run the following promotion query with the actual values. It changes the default student profile into an active administrator profile.

   ```sql
   begin;
   select set_config('request.jwt.claim.role', 'service_role', true);

   update public.profiles
   set
     first_name = 'Danish',
     last_name = 'Nadar',
     role = 'admin',
     is_active = true
   where email = 'danish.t.nadar@gmail.com';

   delete from public.student_profiles
   where user_id = (
     select id from public.profiles where email = 'danish.t.nadar@gmail.com'
   );

   insert into public.admin_profiles (user_id, department)
   select id, 'MSI Camps'
   from public.profiles
   where email = 'danish.t.nadar@gmail.com'
   on conflict (user_id) do update
   set department = excluded.department;

   commit;
   ```

3. Confirm the generated username and status:

   ```sql
   select username, email, role, is_active
   from public.profiles
   where email = 'danish.t.nadar@gmail.com';
   ```

Administrator usernames are still generated as first initial + last name: `Danish Nadar` becomes `dnadar`. If it is already taken, the next suffix is used: `dnadar1`, `dnadar2`, and so on. It is an internal account identifier; administrators sign in with their email address and password. IT should share the email address and temporary password through an approved channel, then require the staff member to change the temporary password using the Supabase Auth administration process.

### Reset, deactivate, or remove access

- Reset an administrator password in **Authentication -> Users**. Do not place a plaintext password in SQL, frontend JavaScript, or source control.
- Change `is_active` to `false` in `public.profiles` to revoke CampGrids access immediately; existing email-verified sessions will fail the database check.
- Keep the staff user's email current. The verification code always goes to `profiles.email`, which is created from the Auth email identity.
- Create teacher accounts only from the verified administrator dashboard. The dashboard supports a single-teacher form and a CSV batch import; both generate a username and temporary password, then produce a downloadable one-time report. Do not store that report in a shared drive.

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

`first_name`, `last_name`, and `email` are required. `title` is optional. CampGrids allocates each username as first initial plus last name (`fyu`, `fyu1`, and so on), generates a high-entropy temporary password, and returns it only in the downloaded report.

Student CSV columns remain:

```csv
first_name,last_name,grade,guardian_name,guardian_email
Fannie,Yu,5,,
```

The teacher selects a class, clicks the Mother Grid cells that should make up that class's sub-grid, and those selections save directly to `class_grid_cells`. Campers enrolled in that class see the same selected Grid in their dashboard. Mother Grid cells remain administrator-managed; teachers can only add or remove selections for classes they manage.

### Teacher first sign-in

1. The administrator privately shares the generated username and temporary password from the one-time CSV report.
2. The teacher signs in on the Teacher tab with those credentials.
3. CampGrids immediately sends a Supabase password-recovery email to the teacher's work address and signs out the temporary session.
4. The teacher opens that email, chooses a personal password in `settings.html`, then signs in normally and completes emailed 2FA.

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
