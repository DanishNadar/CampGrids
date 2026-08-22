# CampGrids Supabase setup

1. Create a Supabase project and run `schema.sql` in its SQL editor.
2. Deploy the roster function:

   ```powershell
   supabase functions deploy provision-students
   ```

3. Copy `supabase-config.example.js` to `supabase-config.js` in the site root and provide the project URL and **anon** key. Do not put the service-role key in a browser file.
4. In Supabase Auth, disable email confirmation for the demo or configure a real confirmation email provider. Create an MSI account, then use the bootstrap SQL at the bottom of `schema.sql` to make it the first admin.
5. To have admin navigation and dropdown changes appear instantly in already-open browsers, add `navigation_items` and `dropdown_options` to the `supabase_realtime` publication in Database → Replication.
6. Serve the site through a local or hosted web server; Supabase Auth does not work correctly from `file://` URLs. Add the host to Auth → URL Configuration.

The roster upload accepts `.csv`, `.xlsx`, and `.xls` files with headers `first_name`, `last_name`, `grade`, `guardian_name`, `guardian_email`, and optional `temporary_password`. The dashboard shows generated student credentials immediately after the import so teachers can distribute them once.
