# CampGrids Supabase setup

## Security model

Campers use only a class code and CampGrids username. They cannot access another camper's data.

Teachers and MSI administrators must complete two steps before they can access any camper data:

1. Their assigned teacher email/username or administrator email, plus password.
2. A one-time, email-delivered sign-in link sent to the email address on their CampGrids account.

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

### Configure free email verification

The Supabase Free plan's default sender does not permit template edits, so CampGrids deliberately uses its secure Magic Link as the email second factor. No custom SMTP is required for the demo. The link returns to `verify.html`, which binds the verified email session to the password sign-in request and opens the correct teacher or administrator workspace.

In **Authentication -> URL Configuration** add this exact redirect URL:

```text
https://camp-grids.vercel.app/verify.html**
```

If your production domain changes, set the Edge Function secret to that origin and redeploy it:

```powershell
npx supabase secrets set CAMPGRIDS_APP_ORIGIN=https://your-production-domain.example --project-ref hofninqlkcuzgboslodq
npx supabase functions deploy request-staff-email-2fa --project-ref hofninqlkcuzgboslodq --use-api
```

The built-in sender is suitable for testing only: it has recipient and rate limits. For a live program, configure custom SMTP in **Authentication -> Emails -> SMTP Settings**, verify its sending domain, and disable click tracking for authentication links.

## Existing project migration

If this project previously used the phone-based implementation, run [`20260823_zz_staff_email_2fa.sql`](migrations/20260823_zz_staff_email_2fa.sql) once in the SQL editor after the earlier migrations. It deletes the retired phone allowlist and phone-session records, then installs the email-2FA tables, functions, and RLS rules.

For a new project, `schema.sql` already contains the final email-2FA design; do not run an old phone migration. If the old Edge Function was deployed, it can be removed after the new function is live:

```powershell
supabase functions delete admin-phone-login
```

If the sign-in page says it could not send the verification email, open **Edge Functions** in the Supabase dashboard and confirm that `request-staff-email-2fa` exists and is active. A `404 Requested function was not found` response means it has not been deployed yet. Deploy it with:

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
- Keep the staff user's email current. The verification link always goes to `profiles.email`, which is created from the Auth email identity.
- Create teacher accounts only from the verified administrator dashboard. That workflow supplies a teacher's initial password and email; the teacher must then complete emailed 2FA at sign-in.

## Verification checklist

1. Sign in at `/admin` with an administrator email address and password. A secure link should arrive at that email address.
2. Open the link. The administrator dashboard should load only after it is accepted.
3. Sign in through the Teacher tab with a teacher username/email and password. The teacher dashboard should load only after the emailed link is opened.
4. Open a staff dashboard with a password-only session or after more than eight hours. It must redirect to sign-in and must not expose camper data.
5. Sign in as a camper with a valid class code and username. No password or staff email code should be requested.

Only MSI administrators can create teacher accounts and upload camper rosters. Camper uploads use a standardized `.csv` with headers `first_name`, `last_name`, `grade`, `guardian_name`, and `guardian_email`; the dashboard shows generated student usernames immediately after accounts are created.
