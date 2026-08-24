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
   supabase functions deploy provision-teacher
   supabase functions deploy student-class-login
   supabase functions deploy request-staff-email-2fa
   ```

3. Copy `supabase-config.example.js` to `supabase-config.js` in the site root and provide the project URL and **anon** key. Never place the service-role key in a browser file.
4. In **Authentication -> Providers**, enable Email/password authentication.
5. In **Authentication -> URL Configuration**, set the Site URL to the CampGrids production URL—not another project—and add the exact CampGrids `auth.html` URL to Redirect URLs. Student sign-in uses this allowlist for its one-time link.
6. In **Database -> Replication**, add `navigation_items` and `dropdown_options` to `supabase_realtime` if administrators' live-site changes should appear in open browsers immediately.
7. Serve the site over a local or hosted web server. Supabase Auth does not work reliably from `file://` URLs.

### Configure the emailed verification code

The staff flow calls Supabase's email OTP endpoint from `request-staff-email-2fa`. In **Authentication -> Email Templates**, edit the **Magic Link** template to contain `{{ .Token }}` and not `{{ .ConfirmationURL }}`. Using the token tells Supabase to send a numeric OTP that the CampGrids form can verify.

Example subject:

```text
Your CampGrids verification code
```

Example HTML body:

```html
<h2>CampGrids verification code</h2>
<p>Use this one-time code to finish signing in:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.16em;">{{ .Token }}</p>
<p>This code expires shortly. Do not share it with anyone.</p>
```

For testing, Supabase's default email sender delivers only to pre-authorized project-team addresses and is limited to two messages per hour. For a real camp program, configure a custom SMTP provider in **Authentication -> Emails -> SMTP Settings**, verify its sending domain, disable click tracking for these messages, and set a sensible OTP rate limit in **Authentication -> Rate Limits**. Email avoids SMS charges, but an email delivery service may still have its own costs.

## Existing project migration

If this project previously used the phone-based implementation, run [`20260823_zz_staff_email_2fa.sql`](migrations/20260823_zz_staff_email_2fa.sql) once in the SQL editor after the earlier migrations. It deletes the retired phone allowlist and phone-session records, then installs the email-2FA tables, functions, and RLS rules.

For a new project, `schema.sql` already contains the final email-2FA design; do not run an old phone migration. If the old Edge Function was deployed, it can be removed after the new function is live:

```powershell
supabase functions delete admin-phone-login
```

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
- Create teacher accounts only from the verified administrator dashboard. That workflow supplies a teacher's initial password and email; the teacher must then complete emailed 2FA at sign-in.

## Verification checklist

1. Sign in at `/admin` with an administrator email address and password. A code should arrive at that email address.
2. Enter the code. The administrator dashboard should load only after it is accepted.
3. Sign in through the Teacher tab with a teacher username/email and password. The teacher dashboard should load only after an email code is accepted.
4. Open a staff dashboard with a password-only session or after more than eight hours. It must redirect to sign-in and must not expose camper data.
5. Sign in as a camper with a valid class code and username. No password or staff email code should be requested.

Only MSI administrators can create teacher accounts and upload camper rosters. Camper uploads use a standardized `.csv` with headers `first_name`, `last_name`, `grade`, `guardian_name`, and `guardian_email`; the dashboard shows generated student usernames immediately after accounts are created.
