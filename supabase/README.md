# CampGrids Supabase setup

1. Create a Supabase project and run `schema.sql` in its SQL editor.
2. Deploy the account, roster, and student sign-in functions:

   ```powershell
   supabase functions deploy provision-students
   supabase functions deploy provision-teacher
   supabase functions deploy student-class-login
   ```

3. Copy `supabase-config.example.js` to `supabase-config.js` in the site root and provide the project URL and **anon** key. Do not put the service-role key in a browser file.
4. In Supabase Auth, disable email confirmation for the demo or configure a real confirmation email provider. Create an MSI account, then use the bootstrap SQL at the bottom of `schema.sql` to make it the first admin.
5. To have admin navigation and dropdown changes appear instantly in already-open browsers, add `navigation_items` and `dropdown_options` to the `supabase_realtime` publication in Database → Replication.
6. Serve the site through a local or hosted web server; Supabase Auth does not work correctly from `file://` URLs. Add the host to Auth → URL Configuration.

Set the Supabase Auth **Site URL** to the CampGrids production URL (not another project), and add the exact CampGrids `auth.html` URL to **Redirect URLs**. Supabase only sends a passwordless student session back to that URL when it is in the allow list.

If you installed an earlier copy of `schema.sql`, run new files in `supabase/migrations/` in the SQL editor as they are added. Run `20260822_create_class_rpc.sql` to enable the RLS-safe teacher class creation flow, followed by `20260822_fix_role_validation_triggers.sql` to correct class-owner role validation, `20260823_admin_account_provisioning.sql` to restrict teacher account and camper roster provisioning to MSI administrators, `20260823_simplify_assignment_status.sql` to migrate assignment states to In progress or Completed, and `20260823_admin_username_generation.sql` to assign administrator usernames as first-initial + last-name values.

Only MSI administrators can create teacher accounts and upload camper rosters. Camper uploads use a standardized `.csv` with headers `first_name`, `last_name`, `grade`, `guardian_name`, and `guardian_email`; the dashboard shows generated student usernames immediately after accounts are created.

Students use the normal account page to enter their class code and username; CampGrids verifies that active enrollment and completes a passwordless sign-in. Teachers use the separate Teacher sign-in tab. MSI administrators create teacher accounts after signing in at the intentionally unlinked `/admin` address.

The class code is now part of the student's sign-in credential. Keep active class codes limited to the teacher and enrolled students; the passwordless sign-in function validates the code and username together before it creates a one-time session link.
