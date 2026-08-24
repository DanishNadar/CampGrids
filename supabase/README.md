# CampGrids Supabase setup

## Security model

Campers use only a class code and CampGrids username. They cannot access another camper's data.

Teachers and MSI administrators must complete two steps before they can access any camper data:

1. Their assigned teacher email/username or administrator email, plus password.
2. A one-time code sent to the email address on their CampGrids account.

The database records the second step against the exact Supabase session for eight hours. Row-level security requires that verified staff session for teacher class access, administrative controls, roster imports, and all other staff access to camper records. A password-only session is not enough.

## Initial project setup

1. Create a Supabase project and run [`schema.sql`](schema.sql) in the SQL editor.
2. Deploy the server-side functions:

   ```powershell
   supabase functions deploy provision-students
   supabase functions deploy provision-teachers
   supabase functions deploy student-class-login
   supabase functions deploy request-staff-email-2fa
   ```

3. Copy `supabase-config.example.js` to `supabase-config.js` in the site root and provide the project URL and **anon** key. Never place the service-role key in a browser file.
4. In **Authentication -> Providers**, enable Email/password authentication.
5. In **Authentication -> URL Configuration**, set the Site URL to the CampGrids production URL—not another project—and add the exact CampGrids `auth.html` URL to Redirect URLs. Student sign-in uses this allowlist for its one-time link.
6. In **Database -> Replication**, add `navigation_items` and `dropdown_options` to `supabase_realtime` if administrators' live-site changes should appear in open browsers immediately.
7. Serve the site over a local or hosted web server. Supabase Auth does not work reliably from `file://` URLs.

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

3. Save the SMTP settings. The Email Templates editor becomes available. Open **Authentication -> Emails -> Magic Link** and remove every `{{ .ConfirmationURL }}` reference. Use this subject and body:

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

## Existing project migration

If this project previously used the phone-based implementation, run [`20260823_zz_staff_email_2fa.sql`](migrations/20260823_zz_staff_email_2fa.sql) once in the SQL editor after the earlier migrations. It deletes the retired phone allowlist and phone-session records, then installs the email-2FA tables, functions, and RLS rules. Then run [`20260824_admin_grid_and_teacher_csv.sql`](migrations/20260824_admin_grid_and_teacher_csv.sql) to add the Mother Grid, class sub-grids, and CSV-only teacher provisioning.

For a new project, `schema.sql` already contains the final email-2FA design; do not run an old phone migration. If the old Edge Function was deployed, it can be removed after the new function is live:

```powershell
supabase functions delete admin-phone-login
```

If the sign-in page says it could not send a code, open **Edge Functions** in the Supabase dashboard and confirm that `request-staff-email-2fa` exists and is active. A `404 Requested function was not found` response means it has not been deployed yet. Deploy it with:

```powershell
supabase functions deploy request-staff-email-2fa --project-ref hofninqlkcuzgboslodq
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
- Create teacher accounts only from the verified administrator dashboard. That workflow accepts a CSV, generates the username and temporary password, and produces a downloadable one-time report. Do not store that report in a shared drive.

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
